import { 
  doc, 
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface Pharmacy {
  id: string;
  name: string;
  managerId: string;
  createdAt: string;
}

export const pharmacyService = {
  async updatePharmacy(id: string, data: Partial<Pharmacy>): Promise<void> {
    if (!id) throw new Error('Pharmacy ID is required');
    try {
      const pharmacyRef = doc(db, 'pharmacies', id);
      await updateDoc(pharmacyRef, data);
    } catch (error) {
      console.error('[PharmacyService] Error updating pharmacy:', error);
      throw error;
    }
  },

  async getPharmacy(id: string): Promise<Pharmacy | null> {
    if (!id) throw new Error('Pharmacy ID is required');
    try {
      const docSnap = await getDoc(doc(db, 'pharmacies', id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Pharmacy;
      }
      return null;
    } catch (error) {
      console.error('[PharmacyService] Error fetching pharmacy:', error);
      throw error;
    }
  }
};
