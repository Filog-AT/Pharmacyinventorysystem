import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
 
export type ReceiptItem = {
  medicineId: string;
  name: string;
  quantity: number;
  price: number;
};
 
export type Receipt = {
  id?: string;
  timestamp: Date;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  userId: string;
  userName: string;
};
 
const RECEIPTS_COLLECTION = 'receipts';
 
export const receiptService = {
  async addReceipt(data: Omit<Receipt, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, RECEIPTS_COLLECTION), data);
    return docRef.id;
  },
 
  async getRecentReceipts(max: number = 50): Promise<Receipt[]> {
    const q = query(
      collection(db, RECEIPTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(max),
    );
    const snap = await getDocs(q);
    const receipts: Receipt[] = [];
    snap.forEach((d) => {
      receipts.push({
        id: d.id,
        ...d.data(),
      } as Receipt);
    });
    return receipts;
  },
 
  async clearAllReceipts(): Promise<void> {
    const snap = await getDocs(collection(db, RECEIPTS_COLLECTION));
    const deletions: Promise<void>[] = [];
    snap.forEach((d) => {
      deletions.push(deleteDoc(doc(db, RECEIPTS_COLLECTION, d.id)));
    });
    await Promise.all(deletions);
  },
};
