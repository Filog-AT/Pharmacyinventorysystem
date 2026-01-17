import { useState } from 'react';
import { User, Lock, Building2 } from 'lucide-react';

const users = [
  {
    username: 'owner',
    password: 'owner123',
    role: 'owner',
    name: 'John Smith',
    title: 'Owner'
  },
  {
    username: 'pharmacist',
    password: 'pharmacist123',
    role: 'pharmacist',
    name: 'Sarah Johnson',
    title: 'Pharmacist'
  },
  {
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    name: 'Mike Wilson',
    title: 'Staff Member'
  }
];

export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);

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
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  required
                />
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
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Login Options:</h3>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.username}
                  onClick={() => handleQuickLogin(user)}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Username: {user.username}</p>
                      <p className="text-xs text-gray-400">Password: {user.password}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Click on a user to auto-fill credentials, then click Sign In
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
