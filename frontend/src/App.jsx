import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import GuestBookingPage from "./pages/GuestBooking";
import VehiclePage from "./pages/VehiclePage";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import ViewPage from "./pages/ViewPage";
import MergeRide from "./pages/MergeRide";

function App() {
  return (
  
    <Router>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Routes>
        <Route path="/view" element={<ViewPage />} />
        <Route path="/" element={<Login />} />
        <Route path="/user" element={<UserDashboard />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/guest-booking" element={<GuestBookingPage />} />
        <Route path="/get-vehicles" element={<VehiclePage />} />
        <Route path="/merge-ride" element={<MergeRide />} />
        </Routes>
    </Router>
  );
}

export default App;