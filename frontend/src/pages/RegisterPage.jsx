import { useState } from 'react';
import { Eye, EyeOff, User, Mail, Phone, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+7', country: 'RU', flag: '🇷🇺' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+82', country: 'KR', flag: '🇰🇷' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+971', country: 'AE', flag: '🇦🇪' }
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    countryCode: '+91',
    phoneNumber: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors({ ...validationErrors, [name]: '' });
    }
  };

  const handleCountryCodeChange = (e) => {
    setFormData({ ...formData, countryCode: e.target.value });
  };

  const validateEmail = (email) => email.endsWith('@ils.res.in');
  
  const validatePhone = (number) => /^\d{10,15}$/.test(number);

  const validateForm = () => {
    const errors = {};

    if (!formData.username || formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!validateEmail(formData.email)) {
      errors.email = 'Only emails with ils.res.in domain are allowed';
    }

    if (!validatePhone(formData.phoneNumber)) {
      errors.phoneNumber = 'Enter a valid phone number (10-15 digits)';
    }

    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    const submitData = {
      username: formData.username,
      email: formData.email,
      number: formData.countryCode + formData.phoneNumber,
      password: formData.password
    };

    try {
      setLoading(true);
      
      // Replace this URL with your actual backend URL
      const BASE_URL = import.meta.env.VITE_API_BASE_URL; 
      
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Registration successful! Redirecting to login...');
        // Clear form
        setFormData({
          username: '',
          email: '',
          countryCode: '+91',
          phoneNumber: '',
          password: ''
        });
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-200 via-blue-50 to-purple-200 px-4 py-12">
      <div className="w-full max-w-md relative z-10">
        <div className="relative">
          <div className="w-full border-none shadow-2xl backdrop-blur-sm bg-white/90 pt-12 overflow-hidden rounded-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>

            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20">
              <Lock className="h-10 w-10 text-white drop-shadow-lg" />
            </div>

            <div className="space-y-2 pt-8 text-center px-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create Account
              </h1> 
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {error && (
                  <div className="mb-6 bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-800 rounded-xl p-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-3" />
                      <span className="font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-6">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{success}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="username" className="text-gray-700 font-semibold text-sm">Username</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                    <input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Enter your username"
                      required
                      className={`w-full pl-12 pr-4 py-3 border ${validationErrors.username ? 'border-red-300' : 'border-gray-300'} rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-gray-700 placeholder-gray-400 transition-all duration-200 outline-none`}
                    />
                  </div>
                  {validationErrors.username && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-gray-700 font-semibold text-sm">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="username@ils.res.in"
                      required
                      className={`w-full pl-12 pr-4 py-3 border ${validationErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-gray-700 placeholder-gray-400 transition-all duration-200 outline-none`}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="text-gray-700 font-semibold text-sm">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.countryCode}
                      onChange={handleCountryCodeChange}
                      className="flex-shrink-0 w-24 border border-gray-300 rounded-lg px-2 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      {COUNTRY_CODES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1 group">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className={`w-full pl-12 pr-4 py-3 border ${validationErrors.phoneNumber ? 'border-red-300' : 'border-gray-300'} rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-400 text-gray-700 placeholder-gray-400 transition-all duration-200 outline-none`}
                        required
                      />
                    </div>
                  </div>
                  {validationErrors.phoneNumber && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.phoneNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-gray-700 font-semibold text-sm">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`w-full pl-12 pr-12 py-3 border ${validationErrors.password ? 'border-red-300' : 'border-gray-300'} rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-400 text-gray-700 placeholder-gray-400 transition-all duration-200 outline-none`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Registering...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-4 pb-8 pt-4 px-6">
              <div className="flex items-center w-full justify-center">
                <p className="mx-4 text-gray-500 text-sm font-medium">
                  Already have an account?
                </p>
                <a
                  href="/login"
                  className="font-semibold text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Login
                </a>
              </div>
            </div>
            
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}