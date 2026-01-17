import { useState } from 'react';
import { User, Lock, Building2, Eye, EyeOff } from 'lucide-react';

const users = [
  {
    username: 'owner',
    password: 'owner123',
    role: 'owner',
    name: 'John Smith',
    title: 'Owner',
    permissions: ['Full access', 'Reports', 'Settings', 'All inventory']
  },
  {
    username: 'pharmacist',
    password: 'pharmacist123',
    role: 'pharmacist',
    name: 'Sarah Johnson',
    title: 'Pharmacist',
    permissions: ['Dashboard', 'Sales', 'Reports', 'Inventory management']
  },
  {
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    name: 'Mike Wilson',
    title: 'Staff Member',
    permissions: ['Dashboard', 'Sales', 'View inventory', 'View notifications']
  }
];

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password');
    }
  };

  const handleQuickLogin = (user) => {
    setUsername(user.username);
    setPassword(user.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PharmaCare</h1>
          <p className="text-gray-600">Inventory Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Sign In</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In
            </button>
          </form>

          {/* Demo Credentials Toggle */}
          <div className="mt-6">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showCredentials ? 'Hide' : 'Show'} Demo Credentials
            </button>
          </div>
        </div>

        {/* Demo Credentials */}
        {showCredentials && (
          <div className="mt-4 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Demo Accounts (Click to fill credentials):</h3>
            <div className="space-y-3">
              {users.map((user) => (
                <button
                  key={user.username}
                  onClick={() => handleQuickLogin(user)}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600">{user.name}</p>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{user.title}</p>
                      <div className="text-xs text-gray-600">
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Password:</strong> {user.password}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Permissions:</p>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.map((perm, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Click any account to auto-fill credentials, then click Sign In
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
