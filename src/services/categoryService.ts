import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  doc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export type Category = {
  id?: string;
  name: string;
};

export const categoryService = {
  async getCategories(pharmacyId: string): Promise<Category[]> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      const q = collection(db, 'pharmacies', pharmacyId, 'categories');
      const snap = await getDocs(q);
      const categories: Category[] = [];
      snap.forEach(d => {
        categories.push({
          id: d.id,
          ...(d.data() as Category),
        });
      });
      return categories;
    } catch (error) {
      console.error('[CategoryService] Error fetching categories:', error);
      throw error;
    }
  },

  async addCategory(pharmacyId: string, name: string): Promise<string> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      const docRef = await addDoc(collection(db, 'pharmacies', pharmacyId, 'categories'), { name });
      return docRef.id;
    } catch (error) {
      console.error('[CategoryService] Error adding category:', error);
      throw error;
    }
  },

  async deleteCategoryByName(pharmacyId: string, name: string): Promise<void> {
    if (!pharmacyId) throw new Error('Pharmacy ID is required');
    try {
      const q = query(collection(db, 'pharmacies', pharmacyId, 'categories'), where('name', '==', name));
      const snap = await getDocs(q);
      const deletions: Promise<void>[] = [];
      snap.forEach(d => {
        deletions.push(deleteDoc(doc(db, 'pharmacies', pharmacyId, 'categories', d.id)));
      });
      await Promise.all(deletions);
    } catch (error) {
      console.error('[CategoryService] Error deleting category:', error);
      throw error;
    }
  },
};
