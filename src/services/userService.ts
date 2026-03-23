import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  addDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '@/config/firebase';

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  role: 'manager' | 'staff';
  pharmacyId: string;
  pharmacyName?: string;
}

const USERS_COLLECTION = 'users';
const PHARMACIES_COLLECTION = 'pharmacies';

export const userService = {
  // Get pharmacy name helper
  async getPharmacyName(pharmacyId: string): Promise<string> {
    try {
      const docSnap = await getDoc(doc(db, PHARMACIES_COLLECTION, pharmacyId));
      if (docSnap.exists()) {
        return docSnap.data().name || 'PharmaCare';
      }
      return 'PharmaCare';
    } catch (error) {
      console.error('[UserService] Error fetching pharmacy name:', error);
      return 'PharmaCare';
    }
  },

  // Check if pharmacy ID exists
  async checkPharmacyExists(pharmacyId: string): Promise<boolean> {
    try {
      const docSnap = await getDoc(doc(db, PHARMACIES_COLLECTION, pharmacyId));
      return docSnap.exists();
    } catch (error) {
      console.error('[UserService] Error checking pharmacy:', error);
      return false;
    }
  },

  // Create a new account
  async createAccount(name: string, username: string, email: string, password: string, role: 'manager' | 'staff', pharmacyId?: string, pharmacyName?: string): Promise<UserProfile> {
    console.log(`[UserService] Attempting to create ${role} account for:`, { name, username, email });
    try {
      if (!auth) {
        console.error('[UserService] Firebase Auth is not initialized. Check your .env file.');
        throw new Error('Authentication system not ready. Please check your connection or configuration.');
      }

      // Check if username is taken
      const cleanUsername = (username || '').trim().toLowerCase();
      if (!cleanUsername) throw new Error('Username is required.');

      const q = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error(`The username "${cleanUsername}" is already taken. Please choose another one.`);
      }

      // Create Firebase Auth user
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, (email || '').trim(), password);
      } catch (authError: any) {
        console.error('[UserService] FirebaseAuth error:', authError.code, authError.message);
        if (authError.code === 'auth/email-already-in-use') {
          throw new Error('This email address is already in use. Please try signing in instead.');
        }
        if (authError.code === 'auth/weak-password') {
          throw new Error('The password is too weak. Please use at least 6 characters.');
        }
        if (authError.code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        }
        if (authError.code === 'auth/operation-not-allowed') {
          throw new Error('Email/Password authentication is not enabled in your Firebase Console.');
        }
        throw new Error(authError.message || 'Failed to create authentication account.');
      }
      const user = userCredential.user;
      console.log('[UserService] FirebaseAuth user created:', user.uid);

      let finalPharmacyId = pharmacyId;

      // If manager, create a new pharmacy document
      if (role === 'manager') {
        try {
          const pharmacyRef = await addDoc(collection(db, PHARMACIES_COLLECTION), {
            name: pharmacyName || `${name}'s Pharmacy`,
            createdAt: new Date().toISOString(),
            managerId: user.uid
          });
          finalPharmacyId = pharmacyRef.id;
          console.log('[UserService] Pharmacy created:', finalPharmacyId);
          
          // Initialize default categories
          const defaultCategories = [
            'Antibiotic', 'Painkiller', 'Antiviral', 'Antihistamine', 
            'Cardiovascular', 'Diabetes', 'Respiratory', 'Gastrointestinal', 
            'Dermatological', 'Vitamins & Supplements'
          ];
          
          for (const catName of defaultCategories) {
            await addDoc(collection(db, PHARMACIES_COLLECTION, finalPharmacyId, 'categories'), {
              name: catName
            });
          }
        } catch (dbError: any) {
          console.error('[UserService] Firestore error creating pharmacy:', dbError);
          throw new Error('Account created but failed to initialize pharmacy. Please contact support.');
        }
      } else if (role === 'staff' && finalPharmacyId) {
        // Notify manager that pharmacy ID was used
        try {
          const pharmacyDoc = await getDoc(doc(db, PHARMACIES_COLLECTION, finalPharmacyId));
          if (pharmacyDoc.exists()) {
            const managerId = pharmacyDoc.data().managerId;
            if (managerId) {
              // Store notification under pharmacies/{pharmacyId}/notifications
              await addDoc(collection(db, PHARMACIES_COLLECTION, finalPharmacyId, 'notifications'), {
                userId: managerId,
                pharmacyId: finalPharmacyId,
                type: 'info',
                title: 'New Staff Member',
                message: `${name} (${cleanUsername}) has joined your pharmacy using the Pharmacy ID.`,
                time: new Date().toISOString(),
                read: false
              });
            }
          }
        } catch (notifError) {
          console.warn('[UserService] Failed to send notification to manager:', notifError);
        }
      }

      if (!finalPharmacyId) {
        throw new Error('Pharmacy ID is required for staff members');
      }

      const userProfile: UserProfile & { password?: string } = {
        uid: user.uid,
        name,
        username: cleanUsername,
        email: (email || '').trim(),
        role,
        pharmacyId: finalPharmacyId,
        pharmacyName: role === 'manager' ? (pharmacyName || `${name}'s Pharmacy`) : undefined,
        password // Storing password in DB as requested, though not recommended
      };

      // If staff, we need to fetch the pharmacy name separately
      if (role === 'staff' && finalPharmacyId) {
        userProfile.pharmacyName = await this.getPharmacyName(finalPharmacyId);
      }

      // Save user profile to Firestore
      try {
        await setDoc(doc(db, USERS_COLLECTION, user.uid), userProfile);
        console.log('[UserService] User profile saved to Firestore');
      } catch (profileError: any) {
        console.error('[UserService] Firestore error saving profile:', profileError);
        throw new Error('Authentication successful but failed to save profile. Please check database permissions.');
      }

      return userProfile;
    } catch (error: any) {
      console.error('[UserService] Error creating account:', error);
      throw error;
    }
  },

  // Sign in (supports both email and username)
  async signIn(identifier: string, password: string): Promise<UserProfile> {
    console.log('[UserService] Attempting sign-in for:', identifier);
    try {
      if (!auth) {
        console.error('[UserService] Firebase Auth is not initialized. Check your .env file.');
        throw new Error('Authentication system not ready. Please check your connection or configuration.');
      }
      
      const cleanIdentifier = (identifier || '').trim();
      if (!cleanIdentifier) throw new Error('Username or Email is required.');
      
      let email = cleanIdentifier;

      // If identifier doesn't look like an email, assume it's a username
      if (!cleanIdentifier.includes('@')) {
        const q = query(collection(db, USERS_COLLECTION), where('username', '==', cleanIdentifier.toLowerCase()));
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error('User not found. Please check your username or try signing in with your email address.');
        }
        email = snap.docs[0].data().email;
        console.log('[UserService] Username mapped to email:', email);
      }

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        console.error('[UserService] FirebaseAuth signIn error:', authError.code, authError.message);
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
          throw new Error('Incorrect username/email or password.');
        }
        if (authError.code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Please try again later.');
        }
        throw new Error(authError.message || 'Failed to sign in.');
      }
      const user = userCredential.user;
      console.log('[UserService] FirebaseAuth sign-in successful:', user.uid);

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found in database. Please contact your manager.');
      }

      const profile = userDoc.data() as UserProfile;
      
      // Fetch pharmacy name if missing (e.g., from old accounts)
      if (!profile.pharmacyName && profile.pharmacyId) {
        profile.pharmacyName = await this.getPharmacyName(profile.pharmacyId);
      }

      console.log('[UserService] User profile loaded:', profile.username);
      return profile;
    } catch (error: any) {
      console.error('[UserService] Error signing in:', error);
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      if (!auth) return;
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('[UserService] Error signing out:', error);
      throw error;
    }
  },

  // Monitor auth state
  onAuthChanged(callback: (user: UserProfile | null) => void) {
    if (!auth) {
      console.warn('[UserService] Auth not available for onAuthChanged');
      callback(null);
      return () => {};
    }
    
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          if (!profile.pharmacyName && profile.pharmacyId) {
            profile.pharmacyName = await this.getPharmacyName(profile.pharmacyId);
          }
          callback(profile);
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }
};
