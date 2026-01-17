# 🔐 Firebase Credentials Fixer

## Current Status: ⚠️ Invalid API Key

Your app is working in **local-only mode** (all data stored locally).
Firebase sync is disabled due to invalid credentials.

---

## 🛠️ How to Get Valid Credentials

### Step 1: Access Firebase Console

1. Go to https://console.firebase.google.com/
2. Sign in with your Google account
3. Select your project: **pharmacyinventorysystem-ed786**

### Step 2: Get Web API Key

1. Click **⚙️ Project Settings** (gear icon, top left)
2. Go to **General** tab
3. Scroll to **"Your apps"** section
4. Find your **Web app** (looks like `pharmacyinventorysystem-ed786`)
5. Copy the `firebaseConfig` object values

### Step 3: OR Get Service Account Key

1. In Project Settings, go to **Service Accounts** tab
2. Click **"Generate New Private Key"**
3. Download the JSON file
4. Extract the values from the JSON

---

## 📋 Values You Need

Create/update `.env.local` with these values:

```env
VITE_FIREBASE_API_KEY=<your_api_key>
VITE_FIREBASE_AUTH_DOMAIN=<your_auth_domain>
VITE_FIREBASE_PROJECT_ID=<your_project_id>
VITE_FIREBASE_STORAGE_BUCKET=<your_storage_bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
VITE_FIREBASE_APP_ID=<your_app_id>
```

---

## ⚡ Current `.env.local` Values

**File location:** `c:\Users\Frost\OneDrive\Desktop\PharmacyInventorySystem\Pharmacyinventorysystem\.env.local`

## Current values:

## ✅ Verify Firebase Setup

1. **Firestore Database**
   - Project → Firestore Database
   - Create database if needed
   - Create collection: `medicines`
   - Set to **Test Mode** for now

2. **Authentication**
   - Project → Authentication
   - Enable **Email/Password** sign-in

3. **Security Rules** (Temporary for testing)
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;  // Test mode only!
       }
     }
   }
   ```

---

## 🔑 Why the Error Occurred

❌ API Key is invalid or restricted
❌ Firebase Auth is not properly configured
❌ API Key restrictions are blocking the request

---

## ✅ What's Working Now

Even without Firebase:

- ✅ Full inventory management
- ✅ Add/Edit/Delete medicines
- ✅ Multi-role login
- ✅ Reports and analytics
- ✅ POS system
- ✅ All features work locally!

---

## 🚀 Steps to Fix

1. Get fresh credentials from Firebase Console
2. Update `.env.local` with new values
3. Restart dev server: `npm run dev`
4. Refresh browser
5. Check console logs - should show Firebase initialized successfully

---

## 📞 Still Getting Error?

If you see the same error after updating:

1. **Check API Key format** - Should start with `AIzaSy...`
2. **Verify project ID** - Should match Firebase Console
3. **Check Firestore security rules** - Temporarily use test mode
4. **Enable Firebase Auth** - Go to Authentication in Firebase
5. **Clear browser cache** - Ctrl+Shift+Delete, clear all

---

**Status:** App is fully functional locally. Firebase sync is optional but recommended for real-time collaboration.
