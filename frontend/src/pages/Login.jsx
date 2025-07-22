/* eslint-disable react/no-unknown-property */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, Loader2, AlertCircle, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState(null);

  const handleMouseEnter = () => {
    if (mouseLeaveTimeout) {
      clearTimeout(mouseLeaveTimeout);
      setMouseLeaveTimeout(null);
    }
    setIsFormVisible(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsFormVisible(false);
    }, 600);
    setMouseLeaveTimeout(timeout);
  };

  const handleFormMouseEnter = () => {
    if (mouseLeaveTimeout) {
      clearTimeout(mouseLeaveTimeout);
      setMouseLeaveTimeout(null);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          rememberMe
        })
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      
      const roleRoutes = {
        user: "/user",
        manager: "/manager",
        security: "/security"
      };

      window.location.href = roleRoutes[data.role] || "/";
      
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen relative overflow-hidden cursor-pointer">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css?family=Raleway:400,700');
        
        .animated-bg {
          position: fixed;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          top: 0;
          left: 0;
          z-index: 1;
        }
        
        .animated-bg:hover .top:before,
        .animated-bg:hover .top:after,
        .animated-bg:hover .bottom:before,
        .animated-bg:hover .bottom:after,
        .form-visible .top:before,
        .form-visible .top:after,
        .form-visible .bottom:before,
        .form-visible .bottom:after {
          margin-left: 200px;
          transform-origin: -200px 50%;
          transition-delay: 0s;
        }
        
        .animated-bg:hover .login-card,
        .form-visible .login-card {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
          transition-delay: 0.2s;
        }
        
        .animated-bg:hover .hover-text,
        .form-visible .hover-text {
          opacity: 0;
          transition-delay: 0s;
        }
        
        .top:before, .top:after,
        .bottom:before, .bottom:after {
          content: '';
          display: block;
          position: fixed;
          width: 200vmax;
          height: 200vmax;
          top: 50%;
          left: 50%;
          margin-top: -100vmax;
          transform-origin: 0 50%;
          transition: all 0.5s cubic-bezier(0.445, 0.05, 0, 1);
          z-index: 2;
          opacity: 0.75;
          transition-delay: 0.2s;
        }
        
        .top:before {
          transform: rotate(45deg);
          background: linear-gradient(135deg, #e46569, #ff6b6b);
        }
        
        .top:after {
          transform: rotate(135deg);
          background: linear-gradient(135deg, #ecaf81, #ffd93d);
        }
        
        .bottom:before {
          transform: rotate(-45deg);
          background: linear-gradient(135deg, #60b8d4, #4ecdc4);
        }
        
        .bottom:after {
          transform: rotate(-135deg);
          background: linear-gradient(135deg, #3745b5, #667eea);
        }
        
        .login-card {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          z-index: 10;
          opacity: 0;
          transition: all 0.5s cubic-bezier(0.445, 0.05, 0, 1);
          transition-delay: 0s;
          width: 100%;
          max-width: 420px;
          padding: 0 1rem;
        }
        
        .hover-image {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 5;
          transition: opacity 0.3s ease;
          pointer-events: none;
          text-align: center;
          filter: drop-shadow(2px 2px 8px rgba(0,0,0,0.3));
        }
        
        .hover-image img {
          max-width: 280px;
          width: 100%;
          height: auto;
          object-fit: contain;
        }
        
        .hover-text-sub {
          position: absolute;
          top: 65%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 5;
          color: rgba(255, 255, 255, 0.9);
          font-family: 'Raleway', sans-serif;
          font-size: 1.2rem;
          font-weight: 400;
          text-shadow: 1px 1px 4px rgba(0,0,0,0.3);
          transition: opacity 0.3s ease;
          pointer-events: none;
          text-align: center;
        }
        
        .animated-bg:hover .hover-image,
        .animated-bg:hover .hover-text-sub,
        .form-visible .hover-image,
        .form-visible .hover-text-sub {
          opacity: 0;
        }
        
        .custom-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        }
        
        .floating-icon {
          background: linear-gradient(135deg, #667eea, #764ba2);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .custom-input {
          background: rgba(249, 250, 251, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(209, 213, 219, 0.5);
          transition: all 0.3s ease;
        }
        
        .custom-input:focus {
          background: rgba(255, 255, 255, 0.95);
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .custom-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .custom-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3);
        }
        
        .custom-button:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s ease;
        }
        
        .custom-button:hover:before {
          left: 100%;
        }
        
        @media (max-width: 640px) {
          .hover-image img {
            max-width: 200px;
          }
          .hover-text-sub {
            font-size: 1rem;
          }
        }
      `}</style>
      
      {/* Animated Background */}
      <div 
        className={`animated-bg ${isFormVisible ? 'form-visible' : ''}`}
        onMouseEnter={handleMouseEnter}
      >
        <div className="top"></div>
        <div className="bottom"></div>
        
        {/* Hover Image/Logo */}
        <div className="hover-image">
          <img 
            src="/pic/logo.png"
            alt="Vehicle Booking Logo" 
            className="w-64 h-auto object-contain"
          />
        </div>
        
        {/* Login Card */}
        <div 
          className="login-card"
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleFormMouseEnter}
        >
          <Card className="custom-card border-none shadow-2xl pt-12 overflow-hidden">
            {/* Gradient header bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
            
            {/* Floating icon */}
            <div className="floating-icon absolute -top-10 left-40 transform -translate-x-1/2 w-20 h-20 rounded-2xl flex items-center justify-center border border-white/20">
              <Lock className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
            
            <CardHeader className="space-y-2 pt-8 text-center">
              <CardTitle className="text-3xl font-bold gradient-text">
                Welcome
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm font-medium">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-6">
              <div className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="mb-6 bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-800 rounded-xl">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 mr-3" />
                      <AlertDescription className="font-medium">{error}</AlertDescription>
                    </div>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700 font-semibold text-sm">Username</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="custom-input pl-12 rounded-xl h-12 text-gray-700 placeholder-gray-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">Password</Label>
                    <button 
                      type="button" 
                      onClick={() => window.location.href = '/reset-password'} 
                      className="text-sm text-purple-600 hover:text-purple-800 hover:underline font-semibold transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="custom-input pl-12 pr-12 rounded-xl h-12 text-gray-700 placeholder-gray-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer accent-purple-600"
                    />
                    <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-700 font-medium cursor-pointer">
                      Remember me for 30 days
                    </label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  onClick={handleLogin}
                  className="custom-button w-full text-white py-3 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-none"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </Button>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col items-center space-y-4 pb-8 pt-4">
              <div className="flex items-center w-full justify-center">
                <p className="mx-4 text-gray-500 text-sm font-medium">
                  Don&apos;t have an account?{' '}
                </p>
                <a
                  href="/register"
                  className="font-semibold text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Register
                </a>
              </div>
            </CardFooter>
          </Card>
          
          <div className="text-center mt-6 text-sm text-gray-600 font-medium backdrop-blur-sm">
            © 2025 Vehicle Booking System. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;