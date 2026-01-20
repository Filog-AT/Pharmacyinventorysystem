import { db } from '@/config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

export type Supplier = {
  id?: string;
  name: string;
  phone?: string;
};

const SUPPLIERS_COLLECTION = 'suppliers';

export const supplierService = {
  async getSuppliers(): Promise<Supplier[]> {
    const snap = await getDocs(collection(db, SUPPLIERS_COLLECTION));
    const suppliers: Supplier[] = [];
    snap.forEach((d) => {
      suppliers.push({ id: d.id, ...(d.data() as Supplier) });
    });
    return suppliers;
  },
  async addSupplier(supplier: Omit<Supplier, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, SUPPLIERS_COLLECTION), supplier);
    return ref.id;
  },
  async updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
    await updateDoc(doc(db, SUPPLIERS_COLLECTION, id), data);
  },
  async deleteSupplier(id: string): Promise<void> {
    await deleteDoc(doc(db, SUPPLIERS_COLLECTION, id));
  },
};
