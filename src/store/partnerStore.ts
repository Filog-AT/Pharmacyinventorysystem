import { create } from 'zustand';
import { Medicine } from './medicineStore';

interface PartnerPharmacy {
  id: string;
  name: string;
  email?: string;
  location?: string;
  accessLevel: 'read' | 'read-write';
}

interface PartnerStore {
  partnerPharmacies: PartnerPharmacy[];
  selectedPartnerPharmacy: PartnerPharmacy | null;
  partnerMedicines: Medicine[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setPartnerPharmacies: (pharmacies: PartnerPharmacy[]) => void;
  selectPartnerPharmacy: (pharmacy: PartnerPharmacy | null) => void;
  setPartnerMedicines: (medicines: Medicine[]) => void;
  addPartnerPharmacy: (pharmacy: PartnerPharmacy) => void;
  removePartnerPharmacy: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePartnerStore = create<PartnerStore>((set) => ({
  partnerPharmacies: [],
  selectedPartnerPharmacy: null,
  partnerMedicines: [],
  loading: false,
  error: null,
  
  setPartnerPharmacies: (pharmacies) => set({ partnerPharmacies: pharmacies }),
  selectPartnerPharmacy: (pharmacy) => set({ selectedPartnerPharmacy: pharmacy, partnerMedicines: [] }),
  setPartnerMedicines: (medicines) => set({ partnerMedicines: medicines }),
  addPartnerPharmacy: (pharmacy) =>
    set((state) => ({
      partnerPharmacies: [...state.partnerPharmacies, pharmacy],
    })),
  removePartnerPharmacy: (id) =>
    set((state) => ({
      partnerPharmacies: state.partnerPharmacies.filter((p) => p.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export type { PartnerPharmacy };
