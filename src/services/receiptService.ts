import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  doc,
  deleteDoc,
  setDoc,
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

  async getArchivedReceipts(pharmacyId: string): Promise<Receipt[]> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      // Order by archivedAt (set by archiveReceipt). Fall back to unordered if index missing.
      let q;
      try {
        q = query(
          collection(db, 'pharmacies', pharmacyId, 'receiptArchive'),
          orderBy('archivedAt', 'desc')
        );
      } catch {
        q = query(collection(db, 'pharmacies', pharmacyId, 'receiptArchive'));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Receipt[];
    } catch (error) {
      console.error('Error fetching archived receipts:', error);
      // Return empty rather than throwing so the UI still renders
      return [];
    }
  },

  async deleteReceipt(pharmacyId: string, receiptId: string): Promise<void> {
    if (!pharmacyId || !receiptId) throw new Error('Pharmacy ID and Receipt ID are required');
    try {
      const receiptRef = doc(db, 'pharmacies', pharmacyId, 'receipts', receiptId);
      const snap = await getDocs(query(collection(db, 'pharmacies', pharmacyId, 'receipts')));
      const target = snap.docs.find((docSnap) => docSnap.id === receiptId);
      if (!target) throw new Error('Receipt not found');
      const archivedReceipt = {
        ...target.data(),
        deletedAt: new Date().toISOString(),
        deleted: true,
      };
      const archiveRef = doc(collection(db, 'pharmacies', pharmacyId, 'receiptArchive'), receiptId);
      await addDoc(collection(db, 'pharmacies', pharmacyId, 'receiptArchive'), archivedReceipt);
      await deleteDoc(receiptRef);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  },

  async clearAllReceipts(pharmacyId: string): Promise<void> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      const q = query(collection(db, 'pharmacies', pharmacyId, 'receipts'));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing all receipts:', error);
      throw error;
    }
  },

  // Archive a single receipt by moving it to 'receiptArchive' sub-collection.
  // The original sale data is preserved — only moved, never deleted.
  async archiveReceipt(pharmacyId: string, receipt: any): Promise<void> {
    if (!pharmacyId || !receipt?.id) throw new Error('Pharmacy ID and receipt are required');
    try {
      const archivedData: any = {
        ...receipt,
        archivedAt: new Date().toISOString(),
      };
      // Firestore cannot store 'undefined' values — strip them out
      Object.keys(archivedData).forEach(k => {
        if (archivedData[k] === undefined) delete archivedData[k];
      });
      // Preserve the original receipt ID in the archive collection
      const archiveDocRef = doc(db, 'pharmacies', pharmacyId, 'receiptArchive', receipt.id);
      await setDoc(archiveDocRef, archivedData);

      // Remove from the active receipts collection
      const activeRef = doc(db, 'pharmacies', pharmacyId, 'receipts', receipt.id);
      await deleteDoc(activeRef);
    } catch (error) {
      console.error('Error archiving receipt:', error);
      throw error;
    }
  }
};
