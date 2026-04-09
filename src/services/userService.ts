import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
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
const VERIFICATIONS_COLLECTION = 'email_verifications';

// RECOMMENDATION: Use EmailJS for frontend email sending without a backend.
// To make this work, you need to sign up at emailjs.com and get these keys:
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_xytsd2q', 
  TEMPLATE_ID: 'template_cb4p5pv', 
  PUBLIC_KEY: 'YPef5l8Z5FtDmdRut', 
};

export const userService = {
  // Get pharmacy name helper
  async getPharmacyName(pharmacyId: string): Promise<string> {
    try {
      const docSnap = await getDoc(doc(db, PHARMACIES_COLLECTION, pharmacyId));
      if (docSnap.exists()) {
        return docSnap.data().name || 'PharmaTrack';
      }
      return 'PharmaTrack';
    } catch (error) {
      console.error('[UserService] Error fetching pharmacy name:', error);
      return 'PharmaTrack';
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

  // Send verification code to email
  async sendVerificationCode(email: string): Promise<void> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required.');

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    try {
      // Store the code in Firestore
      await setDoc(doc(db, VERIFICATIONS_COLLECTION, cleanEmail), {
        code,
        expiresAt: expiresAt.toISOString(),
        verified: false
      });

      // ATTEMPT TO SEND REAL EMAIL (If config is provided)
      if (EMAILJS_CONFIG.PUBLIC_KEY && EMAILJS_CONFIG.PUBLIC_KEY !== 'your_public_key') {
        try {
          // Dynamically import emailjs functions
          const { send, init } = await import('@emailjs/browser');
          
          // Use init() to ensure the public key is set globally for this call
          init(EMAILJS_CONFIG.PUBLIC_KEY);
          
          // Try sending using the send method
          const response = await send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            {
              to_email: cleanEmail,
              verification_code: code,
              app_name: 'PharmaTrack'
            }
          );
          
          console.log('[UserService] Real email sent successfully');
        } catch (emailError: any) {
          console.error('[UserService] Failed to send real email');
          // We don't throw here so the user can still see the code in console for demo/dev
        }
      }
    } catch (error) {
      console.error('[UserService] Error sending verification code:', error);
      throw new Error('Failed to send verification code. Please try again.');
    }
  },

  // Verify the code
  async verifyCode(email: string, code: string): Promise<boolean> {
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const docRef = doc(db, VERIFICATIONS_COLLECTION, cleanEmail);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('No verification code found for this email.');
      }

      const data = docSnap.data();
      const now = new Date();
      const expiresAt = new Date(data.expiresAt);

      if (now > expiresAt) {
        throw new Error('Verification code has expired. Please request a new one.');
      }

      if (data.code !== code) {
        throw new Error('Invalid verification code.');
      }

      // Mark as verified
      await setDoc(docRef, { ...data, verified: true });
      return true;
    } catch (error: any) {
      console.error('[UserService] Error verifying code:', error);
      throw error;
    }
  },

  // Create a new account
  async createAccount(name: string, username: string, email: string, password: string, role: 'manager' | 'staff', pharmacyId?: string, pharmacyName?: string): Promise<UserProfile> {
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
            managerId: user.uid,
            isVerified: true
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
      }

      if (!finalPharmacyId && role === 'staff') {
        throw new Error('Pharmacy ID is required for staff members');
      }

      const userProfile: UserProfile & { password?: string } = {
        uid: user.uid,
        name,
        username: cleanUsername,
        email: (email || '').trim(),
        role,
        pharmacyId: finalPharmacyId || '',
        pharmacyName: role === 'manager' ? (pharmacyName || `${name}'s Pharmacy`) : undefined,
        password
      };

      if (role === 'staff' && finalPharmacyId) {
        userProfile.pharmacyName = await this.getPharmacyName(finalPharmacyId);
      }

      // Save user profile to Firestore
      try {
        await setDoc(doc(db, USERS_COLLECTION, user.uid), userProfile);
        
        // Clean up verification doc
        const cleanEmail = (email || '').trim().toLowerCase();
        await setDoc(doc(db, VERIFICATIONS_COLLECTION, cleanEmail), { verified: false, used: true }, { merge: true });
        
        console.log('[UserService] User profile saved to Firestore');
        return userProfile;
      } catch (dbError: any) {
        console.error('[UserService] Firestore error saving profile:', dbError);
        throw new Error('Account created but failed to save profile. Please contact support.');
      }
    } catch (error: any) {
      console.error('[UserService] Create account error:', error);
      throw error;
    }
  },

  // Get all staff members for a pharmacy
  async getStaffMembers(pharmacyId: string): Promise<UserProfile[]> {
    try {
      if (!pharmacyId) throw new Error('Pharmacy ID is required');
      
      const q = query(
        collection(db, USERS_COLLECTION), 
        where('pharmacyId', '==', pharmacyId)
      );
      
      const snap = await getDocs(q);
      const staff: UserProfile[] = [];
      
      snap.forEach((doc) => {
        staff.push(doc.data() as UserProfile);
      });
      
      return staff;
    } catch (error: any) {
      console.error('[UserService] Error fetching staff members:', error);
      throw error;
    }
  },

  // Delete a staff member
  async deleteStaffMember(uid: string): Promise<void> {
    try {
      if (!uid) throw new Error('User UID is required');
      await deleteDoc(doc(db, USERS_COLLECTION, uid));
      // Note: This only deletes the Firestore profile, not the Firebase Auth user.
      // Firebase Auth deletion usually requires admin privileges or the user to be signed in.
      console.log(`[UserService] Staff member profile ${uid} deleted from Firestore`);
    } catch (error: any) {
      console.error('[UserService] Error deleting staff member:', error);
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

  // Resend verification email
  async resendVerificationEmail(identifier: string): Promise<void> {
    await this.sendVerificationCode(identifier);
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
