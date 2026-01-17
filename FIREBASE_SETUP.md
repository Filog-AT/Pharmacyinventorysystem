# Firebase Integration Setup Guide

## What Was Added

✅ **Zustand State Management** - Global medicine store for state management
✅ **Firebase Configuration** - Cloud Firestore + Authentication setup
✅ **Medicine Service** - CRUD operations for medicines in Firebase
✅ **Environment Configuration** - Secure credential management

## Setup Steps

### 1. Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to **Project Settings** (gear icon)
4. Copy your Web App config values

### 2. Add Credentials to `.env.local`

Edit `.env.local` and add your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Create a new database (Start in test mode for testing)
3. Create a collection named `medicines`

### 4. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Enable **Email/Password** sign-in method
3. (Optional) Enable other methods like Google Sign-in

### 5. Run the App

```bash
npm run dev
```

## Architecture Overview

```
src/
├── config/
│   └── firebase.ts          # Firebase initialization
├── store/
│   └── medicineStore.ts     # Zustand state management
├── services/
│   └── medicineService.ts   # Firebase CRUD operations
└── app/
    └── App.tsx              # Main app (now Firebase-integrated)
```

## Features Enabled

- ✅ Real-time medicine inventory sync with Firebase
- ✅ Global state management with Zustand
- ✅ Firebase authentication integration
- ✅ Automatic data persistence
- ✅ Error handling for Firebase operations
- ✅ Fallback to sample data if Firebase fails

## Testing Firebase Connection

The app will:

1. Check if medicines exist in Firebase
2. If empty, populate with sample data
3. Display all medicines from Firestore in real-time

Check Firebase Console **Firestore Database** to see medicines being added/updated in real-time!

## Security Rules (For Production)

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /medicines/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Important:** Test mode allows anyone to read/write - change this before going to production!
