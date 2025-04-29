import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import GuestBookingPage from "./pages/GuestBooking";
import VehiclePage from "./pages/VehiclePage";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import ViewPage from "./pages/ViewPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPassword from "./pages/ResetPassword";


function App() {
  return (
  
    <Router>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Routes>
        <Route path="/view" element={<ViewPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/user" element={<UserDashboard />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/guest-booking" element={<GuestBookingPage />} />
        <Route path="/get-vehicles" element={<VehiclePage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* <Route path="/merge-ride" element={<MergeRide />} /> */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    </Router>
  );
}

export default App;