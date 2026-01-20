import { db } from '@/config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

export type SupplierOrderItem = {
  name: string;
  quantity: number;
};

export type SupplierOrder = {
  id?: string;
  orderNumber: string;
  items: SupplierOrderItem[];
  supplierName: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  date: string; // ISO date
  deliveredOn?: string;
  cancelledOn?: string;
};

const ORDERS_COLLECTION = 'supplier_orders';

export const orderService = {
  async getOrders(): Promise<SupplierOrder[]> {
    const snap = await getDocs(collection(db, ORDERS_COLLECTION));
    const orders: SupplierOrder[] = [];
    snap.forEach((d) => {
      orders.push({ id: d.id, ...(d.data() as SupplierOrder) });
    });
    return orders;
  },
  async addOrder(order: Omit<SupplierOrder, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, ORDERS_COLLECTION), order);
    return ref.id;
  },
  async updateOrder(id: string, data: Partial<SupplierOrder>): Promise<void> {
    await updateDoc(doc(db, ORDERS_COLLECTION, id), data);
  },
  async deleteOrder(id: string): Promise<void> {
    await deleteDoc(doc(db, ORDERS_COLLECTION, id));
  },
};
