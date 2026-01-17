# 🔒 Firebase Security Rules Fix

## The Issue

Error: `Firebase: Error (auth/invalid-api-key)`

This usually means:

1. ❌ API Key is restricted
2. ❌ Firebase Security Rules are blocking access
3. ❌ Auth is required but not enabled

## ✅ Solution: Update Security Rules

### Step 1: Open Firebase Console

1. Go to https://console.firebase.google.com/
2. Select: `pharmacyinventorysystem-ed786`
3. Left menu → **Firestore Database**

### Step 2: Update Security Rules (Temporary - for testing)

1. Click **Rules** tab at the top
2. Replace all content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

### Step 3: (Optional) Enable Anonymous Auth

1. Left menu → **Authentication**
2. **Sign-in method** tab
3. Click **Anonymous**
4. Enable it
5. Click **Save**

### Step 4: Restart Dev Server

```bash
# In terminal:
npm run dev
```

Then refresh your browser.

---

## ⚠️ Important Security Note

**The rules above are for TESTING ONLY!**

For production, use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /medicines/{document=**} {
      // Only authenticated users can access
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.pharmacyId;
    }

    match /partner_medicines/{document=**} {
      // Partners can only read
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 🧪 Test the Fix

After updating rules:

1. **Open browser DevTools** (F12)
2. **Go to Console** tab
3. **Refresh page** (Ctrl+R)
4. Look for logs:
   - ✅ `[Firebase] App initialized successfully`
   - ✅ `[Firebase] Firestore initialized`
   - ✅ `[Firebase] Auth initialized successfully`

---

## 🚀 What Happens Next

Once rules are fixed:

- ✅ Firebase will initialize properly
- ✅ App will sync medicines to Firestore
- ✅ All changes will persist in the cloud
- ✅ Real-time updates enabled

---

## 📞 Still Having Issues?

If it still doesn't work:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+Shift+R)
3. **Check `.env.local`** - Make sure credentials are correct
4. **Verify project** - Confirm it's the right Firebase project
5. **Check console logs** - What exact error message appears?

---

**That's it!** Update the security rules and you should be good to go! 🎉
