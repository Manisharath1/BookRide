import { LayoutDashboardIcon, ViewIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DashboardPage = () => {
  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboardIcon size={20} /> },
    { name: "View Bookings", path: "/view", icon: <ViewIcon size={20} /> },
  ];

  const statCards = [
    { label: "Available Vehicles", value: 18 },
    { label: "Active Bookings", value: 12 },
    { label: "Total Drivers", value: 8 },
    { label: "Completed Trips", value: 96 },
    { label: "Pending Bookings", value: 5 },
  ];

  const bookingsPerDay = [
    { day: "Mon", bookings: 5 },
    { day: "Tue", bookings: 8 },
    { day: "Wed", bookings: 6 },
    { day: "Thu", bookings: 10 },
    { day: "Fri", bookings: 7 },
    { day: "Sat", bookings: 4 },
    { day: "Sun", bookings: 3 },
  ];

  const driverActivity = [
    { driver: "John", bookings: 25 },
    { driver: "Mike", bookings: 18 },
    { driver: "Sara", bookings: 12 },
    { driver: "Emma", bookings: 9 },
    { driver: "Luke", bookings: 5 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <div className="relative w-full z-10">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-20">
          <div className="mx-auto flex justify-between items-center h-full px-4">
            <h2 className="text-white font-semibold text-2xl">Vehicle Booking System</h2>
            <div className="space-x-4">
              <Link to="/" className="bg-white text-blue-700 px-4 py-2 rounded-md hover:bg-gray-100 font-medium">Login</Link>
              <Link to="/register" className="bg-white text-red-700 px-4 py-2 rounded-md hover:bg-gray-100 font-medium">Register</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-64 bg-blue-950 text-white flex-shrink-0 overflow-y-auto">
          <nav className="py-2">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="flex items-center py-2 px-4 mx-2 rounded-md text-gray-300 hover:bg-blue-900"
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl shadow p-4">
                <h3 className="text-sm font-medium text-gray-500">{card.label}</h3>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Bookings Per Day */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Bookings Per Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingsPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#8884d8" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Driver Activity */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Driver Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={driverActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="driver" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#00C49F" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Vehicle Booking System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DashboardPage;
