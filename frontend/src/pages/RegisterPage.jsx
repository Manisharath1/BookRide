import axios from 'axios';
import { useState } from 'react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    number: '',
    password: '',
    role: 'user'
  });

  const [verificationStep, setVerificationStep] = useState('initial');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateEmail = (email) => email.endsWith('@ils.res.in');
  const validatePhone = (number) => /^\+\d{10,15}$/.test(number);

  const handleSendVerification = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    // console.log("BASE_URL =", BASE_URL);


    if (!validateEmail(formData.email)) {
      setError('Only emails with ils.res.in domain are allowed');
      return;
    }

    if (!validatePhone(formData.number)) {
      setError('Enter a valid phone number with country code (e.g., +91XXXXXXXXXX)');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/api/auth/send-email`, {
        number: formData.number,
        email: formData.email
      });
      setVerificationStep('verify');
      setSuccess('Verification code sent to your phone');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const BASE_URL = import.meta.env.VITE_API_BASE_URL;

    if (!userEnteredCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/api/auth/verify-code`, {
        number: formData.number,
        code: userEnteredCode
      });
      setSuccess('Phone number verified successfully');
      setVerificationStep('register');
      handleSubmitRegistration();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRegistration = async () => {

    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, formData);
      setSuccess(response.data.message);
      setTimeout(() => {
        window.location.href = formData.role === 'user' ? '/user' : '/manager';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="signup-container w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="bg-purple-600 py-4">
          <h2 className="text-2xl font-bold text-center text-white">Create Account</h2>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>{success}</span>
            </div>
          )}

          {verificationStep === 'initial' ? (
            <form onSubmit={handleSendVerification} className="space-y-5">
              <Input 
                label="Username" 
                name="username" 
                value={formData.username} 
                onChange={handleChange} 
                required 
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                }
              />
              
              <Input 
                label="Phone Number" 
                name="number" 
                value={formData.number} 
                onChange={handleChange} 
                required 
                placeholder="+91XXXXXXXXXX" 
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                }
              />
              
              <Input 
                label="Email Address" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                type="email" 
                required 
                placeholder="youremail@ils.res.in" 
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                }
              />
              
              <Input 
                label="Password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                type="password" 
                required 
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                }
              />
              
              <Select 
                name="role" 
                value={formData.role} 
                onChange={handleChange} 
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                  </svg>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? 'Processing...' : 'Register'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="text-center mb-6">
                <div className="bg-blue-50 text-blue-600 py-2 px-4 rounded-full inline-flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span>Verification Required</span>
                </div>
              </div>
              
              <Input
                label="Enter verification code"
                value={userEnteredCode}
                onChange={(e) => setUserEnteredCode(e.target.value)}
                required
                icon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                }
              />
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? 'Verifying...' : 'Complete Registration'}
              </button>
              
              <div className="grid grid-cols-1 gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleSendVerification}
                  className="w-full bg-white text-purple-600 border border-purple-500 py-2 rounded-lg hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Resend Code
                </button>
                
                <button
                  type="button"
                  onClick={() => setVerificationStep('initial')}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  Change Email/Phone
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account?</span>
            <a href="/" className="text-purple-600 hover:text-purple-800 ml-1 font-medium">Login</a>
          </div>
          
          <div className="mt-2 text-center">
            <a href="/help" className="text-purple-600 hover:text-purple-800 text-sm inline-flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Need help?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components with enhanced design
const Input = ({ label, icon, type = "text", ...props }) => (
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-medium mb-2">{label}</label>
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      <input 
        type={type} 
        className={`w-full px-3 py-2 ${icon ? 'pl-10' : 'pl-3'} border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`} 
        {...props} 
      />
    </div>
  </div>
);

const Select = ({ name, value, onChange, icon }) => (
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-medium mb-2">Role</label>
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 ${icon ? 'pl-10' : 'pl-3'} border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
        required
      >
        <option value="user">User</option>
        <option value="manager">Manager</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>
);
