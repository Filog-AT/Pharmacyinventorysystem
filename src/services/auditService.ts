import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export type AuditActionType = 'MEDICINE_ADD' | 'MEDICINE_EDIT' | 'MEDICINE_DELETE' | 'MEDICINE_SOLD' | 'USER_ADD' | 'USER_EDIT' | 'USER_DELETE' | 'LOGIN' | 'LOGOUT' | 'PHARMACY_EDIT' | 'SALE_COMPLETED';

export interface AuditLog {
  id?: string;
  timestamp: any;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditActionType;
  entityType: 'medicine' | 'user' | 'sale' | 'auth' | 'pharmacy';
  entityId?: string;
  entityName?: string;
  details: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
}

export const auditService = {
  // Log an action
  async logAction(pharmacyId: string, log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      console.log('[Audit] Logging action:', log.action, log.entityName);
      const docRef = await addDoc(collection(db, 'pharmacies', pharmacyId, 'audit_logs'), {
        ...log,
        timestamp: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('[Audit] Error logging action:', error);
      throw error;
    }
  },

  // Get all audit logs (with optional filters)
  async getLogs(pharmacyId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: AuditActionType;
    entityType?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      let constraints: any[] = [];

      if (options?.startDate) {
        constraints.push(where('timestamp', '>=', options.startDate));
      }

      if (options?.endDate) {
        constraints.push(where('timestamp', '<=', options.endDate));
      }

      if (options?.userId) {
        constraints.push(where('userId', '==', options.userId));
      }

      if (options?.action) {
        constraints.push(where('action', '==', options.action));
      }

      if (options?.entityType) {
        constraints.push(where('entityType', '==', options.entityType));
      }

      constraints.push(orderBy('timestamp', 'desc'));
      constraints.push(firestoreLimit(options?.limit || 100));

      const q = query(collection(db, 'pharmacies', pharmacyId, 'audit_logs'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const logs: AuditLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
        } as AuditLog);
      });

      return logs;
    } catch (error) {
      console.error('[Audit] Error fetching logs:', error);
      throw error;
    }
  },

  // Get logs for a specific medicine
  async getMedicineLogs(pharmacyId: string, medicineId: string): Promise<AuditLog[]> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      const q = query(
        collection(db, 'pharmacies', pharmacyId, 'audit_logs'),
        where('entityId', '==', medicineId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const logs: AuditLog[] = [];
      
      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
        } as AuditLog);
      });

      return logs;
    } catch (error) {
      console.error('[Audit] Error fetching medicine logs:', error);
      throw error;
    }
  },

  // Get logs for a specific user
  async getUserActivityLogs(pharmacyId: string, userId: string, limitCount: number = 50): Promise<AuditLog[]> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      const q = query(
        collection(db, 'pharmacies', pharmacyId, 'audit_logs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const logs: AuditLog[] = [];
      
      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data(),
        } as AuditLog);
      });

      return logs;
    } catch (error) {
      console.error('[Audit] Error fetching user activity logs:', error);
      throw error;
    }
  },

  // Helper methods for common actions
  async logMedicineAdded(
    pharmacyId: string,
    userId: string,
    userName: string,
    userRole: string,
    medicineId: string,
    medicineName: string,
    medicineData: any
  ): Promise<string> {
    return this.logAction(pharmacyId, {
      userId,
      userName,
      userRole,
      action: 'MEDICINE_ADD',
      entityType: 'medicine',
      entityId: medicineId,
      entityName: medicineName,
      details: medicineData,
    });
  },

  async logMedicineEdited(
    pharmacyId: string,
    userId: string,
    userName: string,
    userRole: string,
    medicineId: string,
    medicineName: string,
    before: any,
    after: any
  ): Promise<string> {
    return this.logAction(pharmacyId, {
      userId,
      userName,
      userRole,
      action: 'MEDICINE_EDIT',
      entityType: 'medicine',
      entityId: medicineId,
      entityName: medicineName,
      details: {},
      changes: { before, after },
    });
  },

  async logMedicineDeleted(
    pharmacyId: string,
    userId: string,
    userName: string,
    userRole: string,
    medicineId: string,
    medicineName: string
  ): Promise<string> {
    return this.logAction(pharmacyId, {
      userId,
      userName,
      userRole,
      action: 'MEDICINE_DELETE',
      entityType: 'medicine',
      entityId: medicineId,
      entityName: medicineName,
      details: {},
    });
  },

  async logMedicineSold(
    pharmacyId: string,
    userId: string,
    userName: string,
    userRole: string,
    medicineId: string,
    medicineName: string,
    quantity: number,
    totalPrice: number,
    customerName?: string
  ): Promise<string> {
    return this.logAction(pharmacyId, {
      userId,
      userName,
      userRole,
      action: 'MEDICINE_SOLD',
      entityType: 'sale',
      entityId: medicineId,
      entityName: medicineName,
      details: {
        quantity,
        totalPrice,
        customerName: customerName || 'Walk-in',
      },
    });
  },

  // Danger: Clear all logs
  async clearAllLogs(pharmacyId: string): Promise<void> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    const snap = await getDocs(collection(db, 'pharmacies', pharmacyId, 'audit_logs'));
    const deletions: Promise<void>[] = [];
    snap.forEach((d) => {
      deletions.push(deleteDoc(doc(db, 'pharmacies', pharmacyId, 'audit_logs', d.id)));
    });
    await Promise.all(deletions);
  },
};
