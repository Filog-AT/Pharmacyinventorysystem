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

const CATEGORIES_COLLECTION = 'categories';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const q = collection(db, CATEGORIES_COLLECTION);
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

  async addCategory(name: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), { name });
      return docRef.id;
    } catch (error) {
      console.error('[CategoryService] Error adding category:', error);
      throw error;
    }
  },

  async deleteCategoryByName(name: string): Promise<void> {
    try {
      const q = query(collection(db, CATEGORIES_COLLECTION), where('name', '==', name));
      const snap = await getDocs(q);
      const deletions: Promise<void>[] = [];
      snap.forEach(d => {
        deletions.push(deleteDoc(doc(db, CATEGORIES_COLLECTION, d.id)));
      });
      await Promise.all(deletions);
    } catch (error) {
      console.error('[CategoryService] Error deleting category:', error);
      throw error;
    }
  },
};
