import { create } from 'zustand';

export interface Medicine {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  expiryDate: string;
  supplier: string;
  price: number;
}

interface MedicineStore {
  medicines: Medicine[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setMedicines: (medicines: Medicine[]) => void;
  addMedicine: (medicine: Medicine) => void;
  updateMedicine: (id: string, medicine: Medicine) => void;
  deleteMedicine: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMedicineStore = create<MedicineStore>((set) => ({
  medicines: [],
  loading: false,
  error: null,
  
  setMedicines: (medicines) => set({ medicines }),
  addMedicine: (medicine) =>
    set((state) => ({
      medicines: [...state.medicines, medicine],
    })),
  updateMedicine: (id, medicine) =>
    set((state) => ({
      medicines: state.medicines.map((m) => (m.id === id ? medicine : m)),
    })),
  deleteMedicine: (id) =>
    set((state) => ({
      medicines: state.medicines.filter((m) => m.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
