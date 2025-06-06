import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, Loader2, AlertCircle, ArrowLeft, CheckCircle, Key } from "lucide-react";

const ResetPassword = () => {
  const [step, setStep] = useState(1); // 1: verify username, 2: reset password, 3: success
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyUsername = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      // Simulate API call to verify username
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username })
      });

      if (!response.ok) {
        throw new Error('Username not found');
      }

      // If username exists, move to step 2
      setStep(2);
      
    } catch (err) {
      setError(err.message || "Username not found. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call to reset password
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          newPassword
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      // Move to success step
      setStep(3);
      
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.href = '/login';
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form className="space-y-3 sm:space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4 sm:mb-6 border-red-200 bg-red-50 text-red-800">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </div>
              </Alert>
            )}
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="username" className="text-gray-700 font-medium text-sm sm:text-base">Username</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg transition-all text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
            </div>

            <Button 
              onClick={handleVerifyUsername} 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="text-sm sm:text-base">Verifying...</span>
                </>
              ) : (
                <>
                  <span className="text-sm sm:text-base">Verify Username</span>
                </>
              )}
            </Button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4 sm:mb-6 border-red-200 bg-red-50 text-red-800">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </div>
              </Alert>
            )}

            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm text-green-800">Username verified: <strong>{username}</strong></span>
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="newPassword" className="text-gray-700 font-medium text-sm sm:text-base">New Password</Label>
              <div className="relative group">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg transition-all text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium text-sm sm:text-base">Confirm New Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg transition-all text-sm sm:text-base h-10 sm:h-11"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg mt-4 sm:mt-6 transition-all duration-200 flex items-center justify-center h-10 sm:h-11 text-sm sm:text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="text-sm sm:text-base">Resetting...</span>
                </>
              ) : (
                <>
                  <span className="text-sm sm:text-base">Reset Password</span>
                </>
              )}
            </Button>
          </form>
        );

      case 3:
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Password Reset Successful!</h3>
              <p className="text-sm text-gray-600">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
            </div>
            <Button 
              onClick={handleBackToLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center h-10 sm:h-11 text-sm sm:text-base"
            >
              <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Back to Login
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Reset Password";
      case 2:
        return "Set New Password";
      case 3:
        return "Success!";
      default:
        return "Reset Password";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Enter your username to verify your account";
      case 2:
        return "Enter your new password";
      case 3:
        return "Your password has been reset successfully";
      default:
        return "Enter your username to verify your account";
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-200 via-blue-50 to-purple-200 p-4">
      <div className="w-full max-w-md">
        <div className="relative">
          <Card className="w-full border-none shadow-lg pt-10">
            {/* Key icon wrapper with fixed positioning relative to the card */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
              <Key className="h-8 w-8 text-white" />
            </div>
            
            <CardHeader className="space-y-1 pt-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-center">{getStepTitle()}</CardTitle>
              <CardDescription className="text-center text-sm sm:text-base text-gray-600">
                {getStepDescription()}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {renderStepContent()}
            </CardContent>
            
            {step < 3 && (
              <CardFooter className="flex flex-col space-y-3 sm:space-y-4 pb-4 sm:pb-6">
                <div className="relative flex items-center w-full">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-2 sm:mx-4 text-gray-600 text-xs sm:text-sm">Remember your password?</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-50 h-10 sm:h-11 text-sm sm:text-base"
                  onClick={handleBackToLogin}
                >
                  <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Back to Login
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
        
        <div className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-gray-600">
          © 2025 Vehicle Booking System. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;