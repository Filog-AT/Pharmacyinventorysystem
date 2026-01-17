# Quick Reference: Firebase Integration

## Files You Need to Update

### 1. `.env.local` (ADD YOUR FIREBASE CREDENTIALS)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 2. Firebase Console Setup

- ✅ Create Firestore Database
- ✅ Create `medicines` collection
- ✅ Enable Email/Password Auth

## Using the Store in Components

```tsx
import { useMedicineStore } from "@/store/medicineStore";

function MyComponent() {
  const { medicines, addMedicine, updateMedicine, deleteMedicine } =
    useMedicineStore();

  // medicines is always synced with Firebase
  return (
    <div>
      {medicines.map((m) => (
        <p key={m.id}>{m.name}</p>
      ))}
    </div>
  );
}
```

## Architecture Flow

```
Components (Dashboard, Categories, etc.)
    ↓ (dispatch actions)
Zustand Store (useMedicineStore)
    ↓ (call service methods)
Firebase Service (medicineService)
    ↓ (CRUD operations)
Firestore Database
```

## What Happens on App Start

1. Firebase checks authentication state
2. If authenticated → loads medicines from Firestore
3. If no medicines exist → populates with sample data
4. All changes auto-sync to Firestore in real-time

## Troubleshooting

| Issue               | Solution                                      |
| ------------------- | --------------------------------------------- |
| "API key not set"   | Add credentials to `.env.local`               |
| Can't read/write    | Check Firestore security rules (test mode OK) |
| Data not persisting | Check Firestore database exists               |
| Auth errors         | Enable Email/Password in Firebase Console     |

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Build for production
```

## Key Files Reference

| File                              | Purpose             |
| --------------------------------- | ------------------- |
| `src/config/firebase.ts`          | Initialize Firebase |
| `src/store/medicineStore.ts`      | Global state        |
| `src/services/medicineService.ts` | Firestore CRUD      |
| `src/app/App.tsx`                 | Main app logic      |
| `.env.local`                      | Your credentials    |

## Ready to Code?

Your system is now Firebase-ready! Start by:

1. Adding Firebase credentials to `.env.local`
2. Running `npm run dev`
3. Watching medicines sync in real-time
