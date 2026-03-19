/**
 * Backend logic for UserManagement component.
 * Contains user filtering and role configurations.
 */

export const filterUsers = (users, searchTerm) => {
  return users.filter(user =>
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const ROLES = [
  { id: 'owner', label: 'Owner', color: 'bg-red-100 text-red-700' },
  { id: 'pharmacist', label: 'Pharmacist', color: 'bg-blue-100 text-blue-700' },
  { id: 'staff', label: 'Staff', color: 'bg-green-100 text-green-700' },
];
