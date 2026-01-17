# Authentication & Role-Based Access Control Setup

## Overview

The Pharmacy Inventory System now includes a complete authentication system with role-based access control (RBAC). Users can log in with different roles that determine which features they can access.

## Demo Accounts

### 1. **Owner** (Full Access)

- **Username**: `owner`
- **Password**: `owner123`
- **Name**: John Smith
- **Permissions**:
  - Full access to all features
  - View Reports
  - Access Settings
  - View all inventory

### 2. **Pharmacist** (Extended Access)

- **Username**: `pharmacist`
- **Password**: `pharmacist123`
- **Name**: Sarah Johnson
- **Permissions**:
  - Dashboard access
  - Sales/POS
  - View Reports
  - Inventory management
  - Customer management

### 3. **Staff** (Limited Access)

- **Username**: `staff`
- **Password**: `staff123`
- **Name**: Mike Wilson
- **Permissions**:
  - Dashboard access
  - Sales/POS
  - View inventory
  - View notifications
  - Customer management (view only)

## Feature Access by Role

| Feature       | Owner | Pharmacist | Staff |
| ------------- | ----- | ---------- | ----- |
| Dashboard     | ✅    | ✅         | ✅    |
| Categories    | ✅    | ✅         | ✅    |
| Sales/POS     | ✅    | ✅         | ✅    |
| Customers     | ✅    | ✅         | ✅    |
| Reports       | ✅    | ✅         | ❌    |
| Notifications | ✅    | ✅         | ✅    |
| Settings      | ✅    | ❌         | ❌    |

## Login Flow

1. User opens the app
2. Login page displays with three sections:
   - **Sign In Form**: Email/password input fields
   - **Show/Hide Credentials**: Toggle to reveal demo accounts
   - **Demo Accounts**: Click any account to auto-fill credentials
3. User submits credentials
4. System validates and logs user in
5. Dashboard displays with role-based menu items
6. User can now access permitted features

## UI Enhancements

### Login Page

- ✅ Beautiful gradient background (blue theme)
- ✅ Clear error messages for invalid credentials
- ✅ Password visibility toggle (Eye icon)
- ✅ Demo credentials display with all information:
  - User name and title
  - Role badge
  - Username/password
  - List of permissions
  - Click to auto-fill functionality

### Sidebar

- ✅ User profile section showing:
  - User name (truncated if too long)
  - Role badge with color-coded design:
    - **Owner**: Red badge
    - **Pharmacist**: Blue badge
    - **Staff**: Green badge
  - User avatar icon (color-matched to role)
- ✅ Dynamic menu based on user role
- ✅ Improved sign-out button with icon
- ✅ Mobile-responsive sidebar with overlay

## Technical Implementation

### Files Modified

1. **Login.jsx** - Enhanced with:
   - Better demo credentials display
   - Password visibility toggle
   - Improved error handling
   - Better UX for quick login

2. **Sidebar.jsx** - Enhanced with:
   - Role-based color coding
   - Better user profile display
   - Improved sign-out button
   - Dynamic menu filtering

3. **AppSimple.tsx** - Already includes:
   - Authentication state management
   - Login/logout handling
   - Role-based page rendering

### User State Type

```typescript
type CurrentUser = {
  uid: string;
  email: string | null;
  name: string;
  role: string;
} | null;
```

## Role-Based Menu Filtering

The sidebar automatically filters menu items based on user role:

```javascript
const menuItems = allMenuItems.filter((item) => item.roles.includes(userRole));
```

Each menu item definition includes a `roles` array specifying which roles can access it.

## Future Enhancements

### Firebase Authentication Integration

To move from demo accounts to real Firebase authentication:

1. Update Login component to use Firebase `signInWithEmailAndPassword()`
2. Replace demo users array with Firestore user collection
3. Store role information in user profile document
4. Implement Firebase authentication state listener

### Additional Features

- Remember me functionality
- Password reset
- Multi-factor authentication (MFA)
- Session management/timeout
- Audit logging for user actions
- User management dashboard (for Owner role)

## Current State

✅ **Authentication UI**: Fully functional with 3 demo roles
✅ **Role-Based Access**: Menu and component filtering working
✅ **Visual Feedback**: Color-coded badges and icons
✅ **Mobile Support**: Responsive design works on all devices

⏳ **TODO**: Real Firebase authentication integration (when ready)

## Testing

To test the authentication system:

1. Open the app at `http://localhost:5175`
2. Click "Show Demo Credentials"
3. Try each role:
   - **Owner**: Full access to all features
   - **Pharmacist**: Limited to Reports (no Settings)
   - **Staff**: Limited to basic operations (no Reports, Settings)
4. Try logging out and logging back in with a different role
5. Verify that sidebar menu changes based on role

## Security Notes

**Important**: This is a demo implementation using hardcoded credentials.

For production:

- Use Firebase Authentication with proper password hashing
- Implement role-based security rules in Firestore
- Use environment variables for sensitive data
- Add session management and CSRF protection
- Implement proper logging and audit trails
