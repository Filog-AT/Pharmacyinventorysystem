import { useState } from 'react';
import { User, Lock, Building2, Eye, EyeOff } from 'lucide-react';

const users = [
  {
    username: 'manager',
    password: 'manager123',
    role: 'manager',
    name: 'John Smith',
    title: 'Manager',
    permissions: ['Full access', 'Reports', 'Settings', 'All inventory']
  },
  {
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    name: 'Mike Wilson',
    title: 'Staff Member',
    permissions: ['Dashboard', 'Categories', 'Notifications']
  }
];

export function Login({ onLogin, pharmacyName }) {
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{pharmacyName || 'PharmaCare'}</h1>
          <p className="text-muted-foreground">Inventory Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-lg border p-8">
          <h2 className="text-2xl font-semibold text-card-foreground mb-6 text-center">Sign In</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-muted-foreground mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-input-background"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          <div className="mt-4 bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Demo Accounts (Click to fill credentials):</h3>
            <div className="space-y-3">
              {users.map((user) => (
                <button
                  key={user.username}
                  onClick={() => handleQuickLogin(user)}
                  className="w-full text-left p-4 border rounded-md hover:border-blue-500 hover:bg-muted transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-card-foreground group-hover:text-blue-600">{user.name}</p>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{user.title}</p>
                      <div className="text-xs text-muted-foreground">
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Password:</strong> {user.password}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Permissions:</p>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.map((perm, idx) => (
                            <span key={idx} className="text-xs bg-muted text-foreground px-2 py-1 rounded">
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
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Click any account to auto-fill credentials, then click Sign In
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
