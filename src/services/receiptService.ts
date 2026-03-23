import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  doc,
  deleteDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface ReceiptItem {
  medicineId: string;
  categoryId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Receipt {
  id?: string;
  items: ReceiptItem[];
  total: number;
  timestamp: any;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
}

export const receiptService = {
  async addReceipt(pharmacyId: string, receiptData: Omit<Receipt, 'id'>): Promise<string> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      // Respect provided timestamp if available, otherwise use now
      let finalTimestamp = Timestamp.now();
      
      if (receiptData.timestamp) {
        if (receiptData.timestamp instanceof Date) {
          finalTimestamp = Timestamp.fromDate(receiptData.timestamp);
        } else if (typeof receiptData.timestamp.toDate === 'function') {
          finalTimestamp = receiptData.timestamp;
        } else if (typeof receiptData.timestamp === 'string' || typeof receiptData.timestamp === 'number') {
          finalTimestamp = Timestamp.fromDate(new Date(receiptData.timestamp));
        }
      }
      
      const docRef = await addDoc(collection(db, 'pharmacies', pharmacyId, 'receipts'), {
        ...receiptData,
        timestamp: finalTimestamp,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding receipt:', error);
      throw error;
    }
  },

  async getReceipts(pharmacyId: string, limitCount: number = 50): Promise<Receipt[]> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      let q;
      if (limitCount > 0) {
        q = query(
          collection(db, 'pharmacies', pharmacyId, 'receipts'),
          orderBy('timestamp', 'desc'),
          firestoreLimit(limitCount)
        );
      } else {
        q = query(
          collection(db, 'pharmacies', pharmacyId, 'receipts'),
          orderBy('timestamp', 'desc')
        );
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Receipt[];
    } catch (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }
  },

  async getRecentReceipts(pharmacyId: string, limitCount: number = 50): Promise<Receipt[]> {
    return this.getReceipts(pharmacyId, limitCount);
  },

  async deleteReceipt(pharmacyId: string, receiptId: string): Promise<void> {
    if (!pharmacyId || !receiptId) throw new Error('Pharmacy ID and Receipt ID are required');
    try {
      await deleteDoc(doc(db, 'pharmacies', pharmacyId, 'receipts', receiptId));
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  }
};
