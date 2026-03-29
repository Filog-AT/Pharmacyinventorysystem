import { create } from 'zustand';

export interface Batch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  supplier: string;
  quantity: number; // Current remaining quantity
  initialQuantity: number; // Total units at time of receipt
  purchasePrice: number; // Price per box/unit as entered
  boxesReceived: number;
  blistersPerBox: number;
  unitsPerBlister: number;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  brandName: string; // Brand name (e.g., Panadol)
  category: string;
  dosageForm: string; // tablet, capsule, etc.
  strength: string; // e.g., 500mg
  tag?: 'Prescription' | 'Non-Prescription'; // New field for categorization
  unit: string; // The base unit (e.g., tablets)
  minStockLevel: number;
  price: number; // Selling price per base unit
  batches: Batch[];
  totalQuantity: number; // Sum of all NON-EXPIRED batch quantities
  createdAt: string;
  // Default values for variations/batches
  defaultBlistersPerBox?: number;
  defaultUnitsPerBlister?: number;
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
