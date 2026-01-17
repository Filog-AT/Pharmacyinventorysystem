# User Management & Audit Logging System

## Overview

The Pharmacy Inventory System now includes a complete **User Management** system and **Comprehensive Audit Logging** that tracks all activities. These features are **Owner-only** and provide full visibility into who did what and when.

## Features

### 1. User Management (Owner Only)

**Location**: Settings → User Management

#### Capabilities:

- ✅ **Add Users** - Create new pharmacy staff accounts
- ✅ **Edit Users** - Update user information and roles
- ✅ **Delete Users** - Remove user accounts
- ✅ **Role Assignment** - Assign Owner, Pharmacist, or Staff roles
- ✅ **Search/Filter** - Find users quickly by name, username, or email

#### User Fields:

- **Username** (unique, cannot change after creation)
- **Full Name**
- **Email Address**
- **Job Title/Position**
- **Role** (Owner, Pharmacist, Staff)
- **Status** (Active, Inactive)
- **Created At** (auto-tracked)

#### Access Control:

- Only **Owner** role can access User Management
- Pharmacist and Staff cannot view this section

### 2. Audit Logging System (Owner Only)

**Location**: Settings → Activity Audit Log

#### Tracked Actions:

```
MEDICINE_ADD      - When a medicine is added to inventory
MEDICINE_EDIT     - When a medicine is updated
MEDICINE_DELETE   - When a medicine is deleted
MEDICINE_SOLD     - When a medicine is sold (POS transaction)
USER_ADD          - When a new user is created
USER_EDIT         - When a user is updated
USER_DELETE       - When a user is deleted
LOGIN             - When a user logs in (coming soon)
LOGOUT            - When a user logs out (coming soon)
```

#### Information Logged:

For each action, the system records:

- **Timestamp** - Exact date and time
- **User** - Who performed the action (name + role)
- **Action Type** - What type of action
- **Entity** - What was affected (medicine name, user name, etc.)
- **Details** - Specific details of the action
- **Changes** - For edits, before/after comparison
- **Customer** - For sales, customer information

#### Filtering & Searching:

- Filter by **Action Type** (Medicine Added, Sold, etc.)
- Filter by **Date Range** (start and end dates)
- Filter by **User** (who performed the action)
- **Text Search** - Search by user, entity name, customer name
- **Refresh** button to reload latest logs

#### Export:

- **Download as CSV** - Export filtered logs to Excel/spreadsheet
- Useful for reports, compliance, analysis

#### Features:

- **View Details** - Click "View" to see complete details and changes
- **Before/After Comparison** - See exactly what changed
- **Statistics** - Shows:
  - Total Activities
  - Unique Users
  - Medicines Sold
  - Changes Made

---

## Database Schema

### Users Collection (`users`)

```firestore
users/
├── {userId}/
│   ├── username: string (unique)
│   ├── name: string
│   ├── email: string
│   ├── title: string
│   ├── role: "owner" | "pharmacist" | "staff"
│   ├── active: boolean
│   └── createdAt: timestamp
```

### Audit Logs Collection (`audit_logs`)

```firestore
audit_logs/
├── {logId}/
│   ├── timestamp: timestamp
│   ├── userId: string
│   ├── userName: string
│   ├── userRole: string
│   ├── action: string (MEDICINE_ADD, MEDICINE_SOLD, etc.)
│   ├── entityType: string (medicine, user, sale, auth)
│   ├── entityId: string
│   ├── entityName: string
│   ├── details: object
│   │   ├── quantity: number
│   │   ├── totalPrice: number
│   │   ├── customerName: string
│   │   └── [other action-specific details]
│   └── changes: object (for EDIT actions)
│       ├── before: object
│       └── after: object
```

---

## How It Works

### Automatic Logging

Whenever these actions happen in the system, they're automatically logged:

**1. Medicine Added**

```
User: Sarah Johnson (pharmacist)
Action: MEDICINE_ADD
Medicine: Aspirin 500mg
Details: { quantity: 100, unit: tablets, price: 2.50, supplier: HealthCorp }
```

**2. Medicine Sold**

```
User: Mike Wilson (staff)
Action: MEDICINE_SOLD
Medicine: Aspirin 500mg
Details: { quantity: 2, totalPrice: 5.00, customerName: "Walk-in" }
```

**3. User Account Modified**

```
User: John Smith (owner)
Action: USER_EDIT
User: Sarah Johnson
Changes:
  - Before: { role: "staff" }
  - After: { role: "pharmacist" }
```

### Querying Logs

The system can retrieve logs with various filters:

```
// Get all medicine sales today
auditService.getLogs({
  action: 'MEDICINE_SOLD',
  startDate: todayStart,
  endDate: todayEnd
})

// Get all changes by a specific user
auditService.getUserActivityLogs('userId123')

// Get history for a specific medicine
auditService.getMedicineLogs('medicineId456')

// Download last 30 days of activity
auditService.getLogs({
  startDate: last30Days,
  limit: 1000
})
```

---

## Use Cases

### For Owner:

1. **Track Staff Performance** - See who's selling what and how much
2. **Inventory Accountability** - Know exactly who added/deleted medicines
3. **Compliance** - Prove compliance and audit trails
4. **Troubleshooting** - See what happened and when
5. **Staff Management** - Monitor user access and activities
6. **Reporting** - Generate sales reports by staff member

### For Compliance:

- Pharmacy regulations often require activity logs
- Export logs for audits or regulatory inspections
- Track controlled substance handling (if added)
- Maintain records of all inventory changes

### For Security:

- Detect suspicious activities
- Track unauthorized access attempts (when auth is integrated)
- Know who accessed sensitive data

---

## Technical Details

### Service Implementations

**User Service** (`userService.ts`)

- `getUsers()` - Fetch all users
- `getUserByUsername(username)` - Find user by username
- `addUser(userData)` - Create new user
- `updateUser(id, data)` - Update user
- `deleteUser(id)` - Delete user
- `deactivateUser(id)` - Soft delete (set inactive)

**Audit Service** (`auditService.ts`)

- `logAction(log)` - Log any action
- `getLogs(filters)` - Retrieve logs with filters
- `getMedicineLogs(medicineId)` - Get history for a medicine
- `getUserActivityLogs(userId)` - Get activity by user
- Helper methods:
  - `logMedicineAdded()` - Log medicine creation
  - `logMedicineEdited()` - Log medicine updates
  - `logMedicineDeleted()` - Log medicine deletion
  - `logMedicineSold()` - Log sales transactions

### Components

**UserManagement.jsx** - User CRUD UI

- Add/edit/delete user interface
- Search and filter users
- Role selector (Owner, Pharmacist, Staff)
- Displays all user information in table

**AuditLog.jsx** - Audit log viewer

- Displays all activities with filters
- Date range filtering
- Action type filtering
- User filtering
- Text search
- Before/after comparison for edits
- CSV export functionality

---

## Integration Steps (Completed)

✅ **Phase 1: Services Created**

- User service with CRUD operations
- Audit service with logging capabilities

✅ **Phase 2: UI Components Built**

- User Management interface
- Audit Log viewer
- Settings integration

⏳ **Phase 3: Data Migration (TODO)**

- Migrate existing demo users to Firestore
- Integrate audit logging into existing operations

⏳ **Phase 4: Complete Integration (TODO)**

- Add logging to medicine operations (add/edit/delete)
- Add logging to sales transactions
- Add logging to user operations

---

## Next Steps

### To Complete Full Integration:

1. **Migrate Demo Accounts to Firestore**

   ```javascript
   // In Firebase Console, create users collection with:
   {
     username: 'owner',
     name: 'John Smith',
     role: 'owner',
     ...
   }
   ```

2. **Update Login.jsx**
   - Replace demo array with Firestore call
   - Call `userService.getUserByUsername()`

3. **Add Audit Logging to Operations**
   - Medicine add: Call `auditService.logMedicineAdded()`
   - Medicine edit: Call `auditService.logMedicineEdited()`
   - Medicine delete: Call `auditService.logMedicineDeleted()`
   - Sales: Call `auditService.logMedicineSold()`

4. **Test Complete System**
   - Add/edit/delete medicines as different users
   - Make sales transactions
   - View audit log as owner
   - Verify all actions are logged

---

## Security Considerations

✅ **Current Security**

- Only Owner can access User Management
- Only Owner can view Audit Logs
- Role-based access control enforced

🔒 **For Production**

- Use Firebase Security Rules to enforce server-side access control
- Enable audit log integrity (immutable)
- Encrypt sensitive data
- Set up automatic log archival
- Implement log retention policies
- Add authentication with MFA
- Monitor suspicious activities

---

## FAQ

**Q: Can I see who sold a specific medicine?**
A: Yes! Go to Audit Log, filter by "Medicine Sold", search the medicine name or date.

**Q: Can I delete audit logs?**
A: No, audit logs are permanent for compliance and security. (This should be enforced in production)

**Q: How long are logs kept?**
A: Currently indefinite, but production should implement retention policies (e.g., 2 years).

**Q: Can I export the data?**
A: Yes! Use the CSV download button in Audit Log to export filtered data.

**Q: What happens when I deactivate a user?**
A: They can no longer log in, but their historical audit logs remain for compliance.

**Q: Can a Pharmacist access audit logs?**
A: No, only the Owner can view audit logs for security reasons.
