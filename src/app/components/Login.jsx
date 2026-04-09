import { useState } from 'react';
import { User, Lock, Building2, Eye, EyeOff, Mail, UserPlus, LogIn, AlertTriangle, UserCircle, Lightbulb } from 'lucide-react';
import { userService } from '@/services/userService';
import { toast } from 'sonner';

export function Login({ onLogin, pharmacyName }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pharmacyNameInput, setPharmacyNameInput] = useState('');
  const [role, setRole] = useState('manager');
  const [pharmacyIdInput, setPharmacyIdInput] = useState(''); // For staff signing up
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false); // New state for verification code step
  const [verificationCode, setVerificationCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!verificationStep) {
          // STEP 1: Details Submission -> Send Code
          if (role === 'staff') {
            const exists = await userService.checkPharmacyExists(pharmacyIdInput);
            if (!exists) {
              toast.error('Invalid Pharmacy ID. Please check with your manager.');
              setLoading(false);
              return;
            }
          }

          await userService.sendVerificationCode(email);
          setVerificationStep(true);
          toast.success('Verification code sent! Please check your email.');
        } else {
          // STEP 2: Verify Code -> Create Account
          await userService.verifyCode(email, verificationCode);
          
          const profile = await userService.createAccount(
            name, 
            username,
            email, 
            password, 
            role, 
            role === 'staff' ? pharmacyIdInput : undefined,
            role === 'manager' ? pharmacyNameInput : undefined
          );
          
          toast.success('Account created successfully!');
          onLogin(profile);
        }
      } else {
        const profile = await userService.signIn(username, password);
        toast.success(`Welcome back, ${profile.name}!`);
        onLogin(profile);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      console.error('[Login] Error:', errorMessage);
      
      // Use a more descriptive toast or alert
      if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('username')) {
        toast.error('Login Failed', {
          description: 'The username or password you entered is incorrect. Please try again.',
          duration: 5000,
        });
      } else if (errorMessage.toLowerCase().includes('taken')) {
        toast.error('Account Creation Failed', {
          description: errorMessage,
          duration: 5000,
        });
      } else {
        toast.error('Authentication Error', {
          description: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await userService.sendVerificationCode(email);
      toast.success('New verification code sent!');
    } catch (error) {
      toast.error(error.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // VERIFICATION UI
  if (verificationStep && isSignUp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-xl border shadow-sm p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-card-foreground mb-4">Verify Your Email</h2>
          <p className="text-muted-foreground mb-6">
            We've sent a 6-digit verification code to <span className="font-semibold text-foreground">{email}</span>. 
            Please enter it below to activate your account.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-left mb-2 text-gray-700">6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.5em] font-black py-4 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Verify & Create Account</>
              )}
            </button>

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Didn't get the code? Resend
              </button>
              <button
                type="button"
                onClick={() => setVerificationStep(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Go back to details
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg shadow-blue-200">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{pharmacyName || 'PharmaTrack'}</h1>
          <p className="text-muted-foreground">Inventory Management System</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-xl border shadow-sm p-8 transition-all duration-300">
          <h2 className="text-2xl font-bold text-card-foreground mb-2 text-center">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {isSignUp ? 'Set up your pharmacy inventory' : 'Access your pharmacy dashboard'}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                  placeholder={isSignUp ? "Choose a username" : "Enter your username"}
                  required
                />
              </div>
            </div>

            {isSignUp && (
              <>
                {role === 'staff' && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4 flex items-start gap-2 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800">
                      <strong>Staff Registration:</strong> A valid Pharmacy ID from your manager is required to join an existing pharmacy.
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pharmacy Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={pharmacyNameInput}
                      onChange={(e) => setPharmacyNameInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                      placeholder={role === 'manager' ? "e.g., PharmaTrack Pharmacy" : "The pharmacy you are joining"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRole('manager')}
                      className={`py-2 text-sm font-medium rounded-md transition-all ${
                        role === 'manager' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('staff')}
                      className={`py-2 text-sm font-medium rounded-md transition-all ${
                        role === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Staff
                    </button>
                  </div>
                </div>

                {role === 'staff' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Pharmacy ID</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={pharmacyIdInput}
                        onChange={(e) => setPharmacyIdInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                        placeholder="Paste Pharmacy ID from manager"
                        required={role === 'staff'}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />
              )}
              {isSignUp ? (role === 'staff' ? 'Create Staff Account' : 'Create Manager Account') : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need a new inventory? Create Manager Account'}
            </button>
          </div>
        </div>

        {/* Footer info for staff */}
        {!isSignUp && (
          <p className="mt-6 text-center text-xs text-muted-foreground px-8">
            Staff members should request their login credentials or Pharmacy ID from their manager.
          </p>
        )}
      </div>
    </div>
  );
}
