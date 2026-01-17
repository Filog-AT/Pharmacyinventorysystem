import {
  collection,
  getDocs,
  query,
  QueryConstraint,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Medicine } from '@/store/medicineStore';

const PARTNER_MEDICINES_COLLECTION = 'partner_medicines';

export const partnerMedicineService = {
  // Get all partner medicines (read-only)
  async getPartnerMedicines(pharmacyId?: string, constraints?: QueryConstraint[]): Promise<Medicine[]> {
    try {
      console.log('[partnerMedicineService] Fetching partner medicines...');
      
      let allConstraints: QueryConstraint[] = constraints || [];
      
      // Add pharmacy filter if specified
      if (pharmacyId) {
        allConstraints = [where('pharmacyId', '==', pharmacyId), ...allConstraints];
      }

      const q = allConstraints.length > 0
        ? query(collection(db, PARTNER_MEDICINES_COLLECTION), ...allConstraints)
        : collection(db, PARTNER_MEDICINES_COLLECTION);
      
      const querySnapshot = await getDocs(q);
      const medicines: Medicine[] = [];
      
      querySnapshot.forEach((doc) => {
        medicines.push({
          id: doc.id,
          ...doc.data(),
        } as Medicine);
      });
      
      console.log('[partnerMedicineService] Got partner medicines:', medicines.length);
      return medicines;
    } catch (error) {
      console.error('[partnerMedicineService] Error fetching partner medicines:', error);
      throw error;
    }
  },

  // Get specific partner pharmacy medicines
  async getPartnerPharmacyMedicines(pharmacyId: string): Promise<Medicine[]> {
    return this.getPartnerMedicines(pharmacyId);
  },
};
