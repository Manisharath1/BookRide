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
  const [showPassword, setShowPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  

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

  // const handleGoogleSignIn = () => {
  //   window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/google`;
  // };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-200 via-blue-50 to-purple-200 p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="relative">
          <Card className="w-full border-none shadow-2xl backdrop-blur-sm bg-white/90 pt-12 overflow-hidden">
            {/* Gradient header bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>
            
            {/* Floating icon with glassmorphism effect */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20">
              <Lock className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
            
            <CardHeader className="space-y-2 pt-8 text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Welcome
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm font-medium">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-6">
              <form onSubmit={handleLogin} className="space-y-6">
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
                      className="pl-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-purple-400 focus:ring-purple-400 rounded-xl h-12 text-gray-700 placeholder-gray-400 transition-all duration-200"
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
                      className="pl-12 pr-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-purple-400 focus:ring-purple-400 rounded-xl h-12 text-gray-700 placeholder-gray-400 transition-all duration-200"
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
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <>
                      <span>Login</span>
                      {/* <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" /> */}
                    </>
                  )}
                </Button>

                {/* Social login option - commented out but redesigned */}
                {/* <div className="relative flex items-center my-6">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink mx-4 text-gray-500 text-sm font-medium">Or continue with</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>
                
                <button
                  type="button"
                  className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center h-12 text-base font-medium shadow-sm"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button> */}
              </form>
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
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-600 font-medium backdrop-blur-sm">
          © 2025 Vehicle Booking System. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;