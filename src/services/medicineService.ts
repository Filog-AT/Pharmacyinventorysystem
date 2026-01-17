import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Medicine } from '@/store/medicineStore';

const MEDICINES_COLLECTION = 'medicines';

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
        medicines.push({
          id: doc.id,
          ...doc.data(),
        } as Medicine);
      });
      
      return medicines;
    } catch (error) {
      console.error('Error fetching medicines:', error);
      throw error;
    }
  },

  // Add a new medicine
  async addMedicine(medicineData: Omit<Medicine, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, MEDICINES_COLLECTION), medicineData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding medicine:', error);
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
};
