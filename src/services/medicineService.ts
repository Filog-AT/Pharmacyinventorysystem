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
  limit as firestoreLimit,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Medicine, Batch } from '@/store/medicineStore';
import { categoryService } from './categoryService';

export const medicineService = {
  // Get all medicines for a pharmacy
  async getMedicines(pharmacyId: string, constraints?: QueryConstraint[]): Promise<Medicine[]> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      // Avoid collectionGroup which requires index by fetching per category
      const categories = await categoryService.getCategories(pharmacyId);
      if (categories.length === 0) return [];

      const medicinePromises = categories.map(async (cat) => {
        if (!cat.id) return [];
        const q = query(
          collection(db, 'pharmacies', pharmacyId, 'categories', cat.id, 'medicines'),
          ...(constraints || [])
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => {
          const data = doc.data();
          const m: Medicine = {
            id: doc.id,
            ...data,
          } as Medicine;
          m.price = Number(data?.price ?? 0);
          m.totalQuantity = Number(data?.totalQuantity ?? 0);
          m.minStockLevel = Number(data?.minStockLevel ?? 0);
          return m;
        });
      });

      const results = await Promise.all(medicinePromises);
      return results.flat();
    } catch (error) {
      console.error('Error fetching medicines:', error);
      throw error;
    }
  },

  // Find medicine by name, brandName, dosageForm and strength (Case Insensitive)
  async findMedicine(pharmacyId: string, name: string, brandName: string, dosageForm: string, strength: string): Promise<Medicine | null> {
    try {
      const categories = await categoryService.getCategories(pharmacyId);
      if (categories.length === 0) return null;

      const targetName = name.trim().toLowerCase();
      const targetBrand = (brandName || '').trim().toLowerCase();
      const targetForm = dosageForm.trim().toLowerCase();
      const targetStrength = strength.trim().toLowerCase();

      const findPromises = categories.map(async (cat) => {
        if (!cat.id) return null;
        
        // Fetch all medicines in category to perform case-insensitive match locally
        // Firestore '==' is case-sensitive and doesn't support case-insensitive natively
        const medsRef = collection(db, 'pharmacies', pharmacyId, 'categories', cat.id, 'medicines');
        const snap = await getDocs(medsRef);
        
        const foundDoc = snap.docs.find(doc => {
          const data = doc.data();
          return (
            String(data.name || '').trim().toLowerCase() === targetName &&
            String(data.brandName || '').trim().toLowerCase() === targetBrand &&
            String(data.dosageForm || '').trim().toLowerCase() === targetForm &&
            String(data.strength || '').trim().toLowerCase() === targetStrength
          );
        });

        if (!foundDoc) return null;
        return { id: foundDoc.id, ...foundDoc.data() } as Medicine;
      });

      const results = await Promise.all(findPromises);
      return results.find(m => m !== null) || null;
    } catch (error) {
      console.error('Error finding medicine:', error);
      return null;
    }
  },

  // Add a new medicine (Product)
  async addMedicine(pharmacyId: string, categoryId: string, medicineData: Omit<Medicine, 'id'>): Promise<string> {
    try {
      if (!pharmacyId || !categoryId) throw new Error('Pharmacy ID and Category ID are required');
      
      // Force Title Case for name and brandName
      const toTitleCase = (str: string) => 
        str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

      const name = toTitleCase((medicineData.name || '').trim());
      const brandName = toTitleCase((medicineData.brandName || '').trim());
      const dosageForm = (medicineData.dosageForm || 'tablet').trim();
      const strength = (medicineData.strength || '').trim();

      // Check for duplicates first including brandName (case-insensitive findMedicine handles this)
      const existing = await this.findMedicine(pharmacyId, name, brandName, dosageForm, strength);
      if (existing) {
        throw new Error('Medicine already exists. Please add stock to the existing product.');
      }

      const dataToSave = {
        ...medicineData,
        pharmacyId,
        categoryId,
        name,
        brandName,
        dosageForm,
        strength,
        batches: medicineData.batches || [],
        totalQuantity: medicineData.totalQuantity || 0,
        createdAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, 'pharmacies', pharmacyId, 'categories', categoryId, 'medicines'), dataToSave);
      return docRef.id;
    } catch (error) {
      console.error('Error adding medicine:', error);
      throw error;
    }
  },

  // Helper to get doc ref for medicine
  getMedicineRef(pharmacyId: string, categoryId: string, medicineId: string) {
    return doc(db, 'pharmacies', pharmacyId, 'categories', categoryId, 'medicines', medicineId);
  },

  // Add a batch to an existing medicine
  async addBatch(pharmacyId: string, categoryId: string, medicineId: string, batchData: Omit<Batch, 'id' | 'createdAt' | 'quantity' | 'initialQuantity'>): Promise<void> {
    try {
      const medicineRef = this.getMedicineRef(pharmacyId, categoryId, medicineId);
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
      
      const docSnap = await getDocs(query(collection(db, 'pharmacies', pharmacyId, 'categories', categoryId, 'medicines')));
      const medicineDoc = docSnap.docs.find(d => d.id === medicineId);

      if (medicineDoc) {
        const medicine = medicineDoc.data() as Medicine;
        const updatedBatches = [...(medicine.batches || []), newBatch];
        
        // Calculate totalQuantity excluding expired batches
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
      console.error('Error adding batch:', error);
      throw error;
    }
  },

  // Update a batch in a medicine
  async updateBatch(pharmacyId: string, categoryId: string, medicineId: string, batchId: string, batchData: Partial<Batch>): Promise<void> {
    try {
      const medicineRef = this.getMedicineRef(pharmacyId, categoryId, medicineId);
      const docSnap = await getDocs(query(collection(db, 'pharmacies', pharmacyId, 'categories', categoryId, 'medicines')));
      const medicineDoc = docSnap.docs.find(d => d.id === medicineId);

      if (medicineDoc) {
        const medicine = medicineDoc.data() as Medicine;
        const updatedBatches = (medicine.batches || []).map(b => {
          if (b.id === batchId || (b as any).batchId === batchId) {
            const updated = { ...b, ...batchData };
            
            const oldInitial = Number(b.initialQuantity || 0);
            const newBoxes = Number(batchData.boxesReceived ?? b.boxesReceived ?? 0);
            const newBlisters = Number(batchData.blistersPerBox ?? b.blistersPerBox ?? 1);
            const newUnits = Number(batchData.unitsPerBlister ?? b.unitsPerBlister ?? 1);
            const newTotal = newBoxes * newBlisters * newUnits;

            if (newTotal !== oldInitial && (batchData.boxesReceived !== undefined || batchData.blistersPerBox !== undefined || batchData.unitsPerBlister !== undefined)) {
              updated.initialQuantity = newTotal;
              updated.quantity = newTotal;
            } else {
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

  // Update a medicine — automatically replaces `undefined` values with deleteField()
  // so Firestore doesn't reject the payload.
  async updateMedicine(pharmacyId: string, categoryId: string, id: string, medicineData: Partial<Medicine>): Promise<void> {
    try {
      const medicineRef = this.getMedicineRef(pharmacyId, categoryId, id);
      // Replace any undefined values with deleteField() sentinel
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(medicineData as Record<string, any>)) {
        sanitized[k] = v === undefined ? deleteField() : v;
      }
      await updateDoc(medicineRef, sanitized);
    } catch (error) {
      console.error('Error updating medicine:', error);
      throw error;
    }
  },

  // Delete a medicine
  async deleteMedicine(pharmacyId: string, categoryId: string, id: string): Promise<void> {
    try {
      const medicineRef = this.getMedicineRef(pharmacyId, categoryId, id);
      await deleteDoc(medicineRef);
    } catch (error) {
      console.error('Error deleting medicine:', error);
      throw error;
    }
  },

  // Get all sales for a pharmacy (derived from receipts)
  async getSales(pharmacyId: string, limitCount: number = 1000): Promise<Array<{ id: string; quantity_sold: number; date_sold: any; medicineId: string }>> {
    try {
      const q = query(
        collection(db, 'pharmacies', pharmacyId, 'receipts'),
        firestoreLimit(Math.ceil(limitCount / 2)) // Receipts usually have multiple items
      );
      const snap = await getDocs(q);
      const allSales: any[] = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp;
        if (Array.isArray(data.items)) {
          data.items.forEach((item: any, idx: number) => {
            allSales.push({
              id: `${doc.id}-${idx}`,
              medicineId: item.medicineId,
              quantity_sold: Number(item.quantity || 0),
              date_sold: timestamp,
            });
          });
        }
      });
      
      return allSales.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching sales from receipts:', error);
      return [];
    }
  },

  // Get sales in the last N days (default 30) for a medicine (derived from receipts)
  async getSalesLastNDays(pharmacyId: string, medicineId: string, days: number = 30, medicineName?: string): Promise<Array<{ quantity_sold: number; date_sold: Date }>> {
    if (!pharmacyId || !medicineId) return [];
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      cutoff.setHours(0, 0, 0, 0);

      const queryCutoff = new Date(cutoff);
      queryCutoff.setDate(queryCutoff.getDate() - 5);

      const q = query(
        collection(db, 'pharmacies', pharmacyId, 'receipts'),
        where('timestamp', '>=', Timestamp.fromDate(queryCutoff))
      );
      
      const qSnap = await getDocs(q);
      const records: Array<{ quantity_sold: number; date_sold: Date }> = [];
      
      const targetId = String(medicineId).trim();
      const targetName = medicineName ? String(medicineName).trim().toLowerCase() : '';

      console.log(`[MedicineService] Searching sales for ${medicineName} (${medicineId}) in last ${days} days...`);
      let foundCount = 0;

      qSnap.forEach((d) => {
        const data = d.data();
        if (!data) return;

        const dt = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (isNaN(dt.getTime()) || dt < cutoff) return;
          
        if (Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            const itemMedId = String(item.medicineId || '').trim();
            const itemMedName = String(item.name || '').trim().toLowerCase();
            
            const isMatch = itemMedId === targetId || (targetName && itemMedName === targetName);
            
            if (isMatch) {
              foundCount++;
              records.push({
                quantity_sold: Number(item.quantity || 0),
                date_sold: dt,
              });
            }
          });
        }
      });
      console.log(`[MedicineService] Found ${foundCount} matching sales records for ${medicineName}`);
      return records;
    } catch (error) {
      console.error('[MedicineService] Error fetching medicine sales:', error);
      return [];
    }
  },

  // Delete a specific batch from a medicine
  async deleteBatch(pharmacyId: string, categoryId: string, medicineId: string, batchId: string): Promise<void> {
    try {
      const medicineRef = this.getMedicineRef(pharmacyId, categoryId, medicineId);
      const docSnap = await getDocs(query(collection(db, 'pharmacies', pharmacyId, 'categories', categoryId, 'medicines')));
      const medicineDoc = docSnap.docs.find(d => d.id === medicineId);

      if (medicineDoc) {
        const medicine = medicineDoc.data() as Medicine;
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
  async processSale(pharmacyId: string, items: { medicineId: string; categoryId: string; quantity: number }[]): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const item of items) {
        const medicineRef = this.getMedicineRef(pharmacyId, item.categoryId, item.medicineId);
        const docSnap = await getDocs(query(collection(db, 'pharmacies', pharmacyId, 'categories', item.categoryId, 'medicines')));
        const medicineDoc = docSnap.docs.find(d => d.id === item.medicineId);

        if (!medicineDoc) continue;
        const medicine = medicineDoc.data() as Medicine;

        let remainingToReduce = item.quantity;
        let updatedBatches = [...(medicine.batches || [])];

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

        if (remainingToReduce > 0) {
          throw new Error(`Insufficient stock for ${medicine.name}`);
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
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      throw error;
    }
  }
};
