import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface PharmacyUser {
  id?: string;
  username: string;
  name: string;
  role: 'manager' | 'staff';
  title: string;
  email?: string;
  createdAt?: Date;
  createdBy?: string;
  active?: boolean;
}

const USERS_COLLECTION = 'users';

export const userService = {
  // Get all users
  async getUsers(): Promise<PharmacyUser[]> {
    try {
      const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
      const users: PharmacyUser[] = [];
      
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data(),
        } as PharmacyUser);
      });
      
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get user by username
  async getUserByUsername(username: string): Promise<PharmacyUser | null> {
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('username', '==', username)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as PharmacyUser;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw error;
    }
  },

  // Add a new user
  async addUser(userData: PharmacyUser): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, USERS_COLLECTION), {
        ...userData,
        createdAt: new Date(),
        active: true,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  },

  // Update a user
  async updateUser(id: string, userData: Partial<PharmacyUser>): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, id);
      await updateDoc(userRef, userData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Delete a user
  async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, USERS_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Deactivate user (soft delete)
  async deactivateUser(id: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, id);
      await updateDoc(userRef, { active: false });
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  },
};
