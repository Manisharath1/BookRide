import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, Loader2, AlertCircle, ArrowRight } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 p-4">
      <div className="w-full max-w-md">
        
        <Card className="w-full border-none shadow-lg">
          <div className="absolute top-40 left-0 right-0 mx-auto w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
            <Lock className="h-8 w-8 text-white" />
          </div>
          
          <CardHeader className="space-y-1 pt-10">
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50 text-red-800">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <AlertDescription>{error}</AlertDescription>
                  </div>
                </Alert>
              )}
              
              <div className="space-y-3">
                <Label htmlFor="username" className="text-gray-700 font-medium">Username</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                  <button 
                    type="button" 
                    onClick={() => window.location.href = '/reset-password'} 
                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg transition-all"
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                    Remember me
                  </label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg mt-6 transition-all duration-200 flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 pb-6">
            <div className="relative flex items-center w-full">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-600 text-sm">Don&apos;t have an account?</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              onClick={() => window.location.href = '/register'}
            >
              Create Account
            </Button>
          </CardFooter>
        </Card>
        
        <div className="text-center mt-6 text-sm text-gray-600">
          © 2025 Company Name. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;