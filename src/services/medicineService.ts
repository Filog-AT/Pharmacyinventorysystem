import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Medicine, Batch } from '@/store/medicineStore';

const MEDICINES_COLLECTION = 'medicines';
const SALES_COLLECTION = 'sales';

export const medicineService = {
  // Get all medicines
  async getMedicines(constraints?: QueryConstraint[]): Promise<Medicine[]> {
    try {
      const q = constraints
        ? query(collection(db, MEDICINES_COLLECTION), ...constraints)
        : collection(db, MEDICINES_COLLECTION);
      
      const querySnapshot = await getDocs(q);
      const medicines: Medicine[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const { id, ...dataWithoutId } = data;
        const m: Medicine = {
          id: doc.id,
          ...dataWithoutId,
        } as Medicine;
        // Ensure numeric fields are coerced properly
        m.price = Number((dataWithoutId as any)?.price ?? 0);
        m.totalQuantity = Number((dataWithoutId as any)?.totalQuantity ?? 0);
        m.minStockLevel = Number((dataWithoutId as any)?.minStockLevel ?? 0);
        // Normalize strings
        m.name = (m.name || '').trim();
        m.dosageForm = (m.dosageForm || 'tablet').trim();
        m.strength = (m.strength || '').trim();
        m.unit = (m.unit || 'units').trim();
        medicines.push(m);
      });
      
      return medicines;
    } catch (error) {
      console.error('Error fetching medicines:', error);
      throw error;
    }
  },

  // Find medicine by name, dosageForm and strength
  async findMedicine(name: string, dosageForm: string, strength: string): Promise<Medicine | null> {
    try {
      const q = query(
        collection(db, MEDICINES_COLLECTION),
        where('name', '==', name.trim()),
        where('dosageForm', '==', dosageForm.trim()),
        where('strength', '==', strength.trim())
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Medicine;
    } catch (error) {
      console.error('Error finding medicine:', error);
      return null;
    }
  },

  // Add a new medicine (Product)
  async addMedicine(medicineData: Omit<Medicine, 'id'>): Promise<string> {
    try {
      const name = (medicineData.name || '').trim();
      const dosageForm = (medicineData.dosageForm || 'tablet').trim();
      const strength = (medicineData.strength || '').trim();

      // Check for duplicates first
      const existing = await this.findMedicine(name, dosageForm, strength);
      if (existing) {
        throw new Error('Medicine already exists. Please add stock to the existing product.');
      }

      const dataToSave = {
        ...medicineData,
        name,
        dosageForm,
        strength,
        batches: medicineData.batches || [],
        totalQuantity: medicineData.totalQuantity || 0,
        createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, MEDICINES_COLLECTION), dataToSave);
      return docRef.id;
    } catch (error) {
      console.error('Error adding medicine:', error);
      throw error;
    }
  },

  // Add a batch to an existing medicine
  async addBatch(medicineId: string, batchData: Omit<Batch, 'id' | 'createdAt' | 'quantity' | 'initialQuantity'>): Promise<void> {
    try {
      const medicineRef = doc(db, MEDICINES_COLLECTION, medicineId);
      const batchId = Math.random().toString(36).substr(2, 9);
      
      // Calculate total units
      const boxes = Number(batchData.boxesReceived || 0);
      const blistersPerBox = Number(batchData.blistersPerBox || 1);
      const unitsPerBlister = Number(batchData.unitsPerBlister || 1);
      const totalUnits = boxes * blistersPerBox * unitsPerBlister;

      const newBatch: Batch = {
        ...batchData,
        id: batchId,
        quantity: totalUnits,
        initialQuantity: totalUnits,
        boxesReceived: boxes,
        blistersPerBox: blistersPerBox,
        unitsPerBlister: unitsPerBlister,
        createdAt: new Date().toISOString(),
      };
      
      const querySnapshot = await getDocs(query(collection(db, MEDICINES_COLLECTION)));
      const medicines = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medicine));
      const medicine = medicines.find(m => m.id === medicineId);

      if (medicine) {
        const updatedBatches = [...(medicine.batches || []), newBatch];
        
        // Calculate totalQuantity excluding expired batches
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Use start of day for comparison
        const totalQty = updatedBatches.reduce((sum, b) => {
          const expDate = new Date(b.expiryDate);
          expDate.setHours(0, 0, 0, 0);
          const isExpired = expDate < today;
          return isExpired ? sum : sum + b.quantity;
        }, 0);

        await updateDoc(medicineRef, {
          batches: updatedBatches,
          totalQuantity: totalQty
        });
      }
    } catch (error) {
      console.error('Error adding batch:', error);
      throw error;
    }
  },

  // Update a batch in a medicine
  async updateBatch(medicineId: string, batchId: string, batchData: Partial<Batch>): Promise<void> {
    try {
      console.log(`[medicineService] Updating batch ${batchId} for medicine ${medicineId}`, batchData);
      const medicineRef = doc(db, MEDICINES_COLLECTION, medicineId);
      const querySnapshot = await getDocs(query(collection(db, MEDICINES_COLLECTION)));
      const medicines = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medicine));
      const medicine = medicines.find(m => m.id === medicineId);

      if (medicine) {
        const updatedBatches = (medicine.batches || []).map(b => {
          if (b.id === batchId || (b as any).batchId === batchId) {
            const updated = { ...b, ...batchData };
            
            // Re-calculate quantity ONLY if boxes/blisters/units changed in the update payload
            // AND the new calculation differs from the old initialQuantity
            const oldInitial = Number(b.initialQuantity || 0);
            const newBoxes = Number(batchData.boxesReceived ?? b.boxesReceived ?? 0);
            const newBlisters = Number(batchData.blistersPerBox ?? b.blistersPerBox ?? 1);
            const newUnits = Number(batchData.unitsPerBlister ?? b.unitsPerBlister ?? 1);
            const newTotal = newBoxes * newBlisters * newUnits;

            if (newTotal !== oldInitial && (batchData.boxesReceived !== undefined || batchData.blistersPerBox !== undefined || batchData.unitsPerBlister !== undefined)) {
              console.log(`[medicineService] Batch units changed. Resetting quantity to ${newTotal}`);
              updated.initialQuantity = newTotal;
              updated.quantity = newTotal;
            } else {
              // Preserve current quantity if units didn't change
              updated.quantity = b.quantity;
              updated.initialQuantity = b.initialQuantity;
            }
            return updated;
          }
          return b;
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalQty = updatedBatches.reduce((sum, b) => {
          const expDate = new Date(b.expiryDate);
          expDate.setHours(0, 0, 0, 0);
          const isExpired = expDate < today;
          return isExpired ? sum : sum + b.quantity;
        }, 0);

        await updateDoc(medicineRef, {
          batches: updatedBatches,
          totalQuantity: totalQty
        });
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error;
    }
  },

  // Update a medicine
  async updateMedicine(id: string, medicineData: Partial<Medicine>): Promise<void> {
    try {
      const medicineRef = doc(db, MEDICINES_COLLECTION, id);
      await updateDoc(medicineRef, medicineData);
    } catch (error) {
      console.error('Error updating medicine:', error);
      throw error;
    }
  },

  // Delete a medicine
  async deleteMedicine(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, MEDICINES_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting medicine:', error);
      throw error;
    }
  },

  // Record a sale in base units (tablets/capsules)
  async addSaleRecord(medicineId: string, quantitySold: number, dateSold: Date = new Date()): Promise<string> {
    try {
      const payload = {
        medicineId,
        quantity_sold: Number(quantitySold) || 0,
        date_sold: dateSold,
      };
      const docRef = await addDoc(collection(db, SALES_COLLECTION), payload);
      return docRef.id;
    } catch (error) {
      console.error('Error recording sale:', error);
      throw error;
    }
  },

  // Get sales in the last N days (default 30) for a medicine, in base units
  async getSalesLastNDays(medicineId: string, days: number = 30): Promise<Array<{ quantity_sold: number; date_sold: Date }>> {
    try {
      const qSnap = await getDocs(query(collection(db, SALES_COLLECTION), where('medicineId', '==', medicineId)));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      cutoff.setHours(0, 0, 0, 0);

      const records: Array<{ quantity_sold: number; date_sold: Date }> = [];
      qSnap.forEach((d) => {
        const data = d.data() as any;
        const dt = data?.date_sold && typeof data.date_sold.toDate === 'function'
          ? data.date_sold.toDate()
          : new Date(data?.date_sold);
        if (!isNaN(dt.getTime()) && dt >= cutoff) {
          records.push({
            quantity_sold: Number(data?.quantity_sold || 0),
            date_sold: dt,
          });
        }
      });
      return records;
    } catch (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
  },

  // Delete a specific batch from a medicine
  async deleteBatch(medicineId: string, batchId: string): Promise<void> {
    try {
      const medicineRef = doc(db, MEDICINES_COLLECTION, medicineId);
      const querySnapshot = await getDocs(query(collection(db, MEDICINES_COLLECTION)));
      const medicines = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medicine));
      const medicine = medicines.find(m => m.id === medicineId);

      if (medicine) {
        const updatedBatches = (medicine.batches || []).filter(b => b.id !== batchId);
        
        const today = new Date();
        const totalQty = updatedBatches.reduce((sum, b) => {
          const isExpired = new Date(b.expiryDate) < today;
          return isExpired ? sum : sum + b.quantity;
        }, 0);

        await updateDoc(medicineRef, {
          batches: updatedBatches,
          totalQuantity: totalQty
        });
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw error;
    }
  },

  // Process a sale (Reduce stock using FEFO)
  async processSale(items: { medicineId: string; quantity: number }[]): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const item of items) {
        const medicineRef = doc(db, MEDICINES_COLLECTION, item.medicineId);
        const querySnapshot = await getDocs(query(collection(db, MEDICINES_COLLECTION)));
        const medicines = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medicine));
        const medicine = medicines.find(m => m.id === item.medicineId);

        if (!medicine) continue;

        let remainingToReduce = item.quantity;
        let updatedBatches = [...(medicine.batches || [])];

        // Legacy compatibility: if there are no batches but totalQuantity > 0, create a synthetic batch
        if ((!updatedBatches || updatedBatches.length === 0) && Number(medicine.totalQuantity || 0) > 0) {
          const future = new Date();
          future.setFullYear(future.getFullYear() + 2);
          updatedBatches = [{
            id: 'legacy-' + Math.random().toString(36).slice(2, 8),
            batchNumber: 'LEGACY',
            expiryDate: future.toISOString().slice(0, 10),
            supplier: '',
            boxesReceived: 0,
            blistersPerBox: 1,
            unitsPerBlister: 1,
            initialQuantity: Number(medicine.totalQuantity || 0),
            quantity: Number(medicine.totalQuantity || 0),
            createdAt: new Date().toISOString(),
          } as unknown as Batch];
        }

        // Sort non-expired batches by expiry date (FEFO)
        const sortedBatchesIndices = updatedBatches
          .map((b, index) => ({ b, index }))
          .filter(x => {
            const exp = new Date(x.b.expiryDate);
            exp.setHours(0, 0, 0, 0);
            return exp >= today && Number(x.b.quantity || 0) > 0;
          })
          .sort((a, b) => new Date(a.b.expiryDate).getTime() - new Date(b.b.expiryDate).getTime())
          .map(x => x.index);

        for (const index of sortedBatchesIndices) {
          if (remainingToReduce <= 0) break;

          const batch = updatedBatches[index];
          if (batch.quantity >= remainingToReduce) {
            batch.quantity -= remainingToReduce;
            remainingToReduce = 0;
          } else {
            remainingToReduce -= batch.quantity;
            batch.quantity = 0;
          }
        }

        // Fallback: if no non-expired batches had stock but medicine.totalQuantity indicates stock,
        // create a reconcile batch to consume from (handles legacy data with expired-only batches).
        if (remainingToReduce > 0) {
          const nonExpiredAvailable = updatedBatches.reduce((sum, b) => {
            const exp = new Date(b.expiryDate);
            exp.setHours(0, 0, 0, 0);
            return exp >= today ? sum + Number(b.quantity || 0) : sum;
          }, 0);
          const reportedTotal = Number(medicine.totalQuantity || 0);
          if (nonExpiredAvailable === 0 && reportedTotal > 0) {
            const future = new Date();
            future.setFullYear(future.getFullYear() + 2);
            const reconcileBatch: Batch = {
              id: 'reconcile-' + Math.random().toString(36).slice(2, 8),
              batchNumber: 'RECON',
              expiryDate: future.toISOString().slice(0, 10),
              supplier: '',
              boxesReceived: 0,
              blistersPerBox: 1,
              unitsPerBlister: 1,
              initialQuantity: reportedTotal,
              quantity: reportedTotal,
              createdAt: new Date().toISOString(),
            } as unknown as Batch;
            updatedBatches.push(reconcileBatch);
            // Consume from reconcile
            const idx = updatedBatches.length - 1;
            const b = updatedBatches[idx];
            if (b.quantity >= remainingToReduce) {
              b.quantity -= remainingToReduce;
              remainingToReduce = 0;
            } else {
              remainingToReduce -= b.quantity;
              b.quantity = 0;
            }
          }
          if (remainingToReduce > 0) {
            throw new Error(`Insufficient stock for ${medicine.name}`);
          }
        }

        // Recalculate totalQuantity
        const totalQty = updatedBatches.reduce((sum, b) => {
          const exp = new Date(b.expiryDate);
          exp.setHours(0, 0, 0, 0);
          const isExpired = exp < today;
          return isExpired ? sum : sum + Number(b.quantity || 0);
        }, 0);

        await updateDoc(medicineRef, {
          batches: updatedBatches,
          totalQuantity: totalQty
        });

        // Record sale in base units for forecasting
        await this.addSaleRecord(item.medicineId, item.quantity, new Date());
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      throw error;
    }
  }
};
