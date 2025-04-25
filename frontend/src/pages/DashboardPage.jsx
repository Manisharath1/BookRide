import { useState, useEffect } from "react";
import { FilterIcon, LayoutDashboardIcon, ViewIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Mock data for development


const DashboardPage = () => {
    // State for all our dashboard data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        availableVehicles: 0,
        activeBookings: 0,
        totalDrivers: 0,
        completedTrips: 0,
        pendingBookings: 0
    });
    const [bookingsPerDay, setBookingsPerDay] = useState([]);
    const [driverActivity, setDriverActivity] = useState([]);
    const [vehicleUtilization, setVehicleUtilization] = useState([]);
    const [bookingStatus, setBookingStatus] = useState([]);
    const [recentBookings, setRecentBookings] = useState([]);

    const navItems = [
        { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboardIcon size={20} /> },
        { name: "View Bookings", path: "/view", icon: <ViewIcon size={20} /> },
    ];

    const [timeRange, setTimeRange] = useState('weekly');


    // Custom colors for charts
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#d88488'];
    const STATUS_COLORS = {
        'available': '#4CAF50',
        'assigned': '#2196F3',
        'in service': '#FF9800',
        'pending': '#FFC107',
        'approved': '#4CAF50',
        'completed': '#2196F3',
        'cancelled': '#F44336',
        'merged': '#9C27B0'
    };

    // Fetch data from API or use mock data
    useEffect(() => {
        const fetchDashboardData = async () => {
        setLoading(true);
        try {
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Fetch all dashboard data in parallel
            const [
            statsRes, 
            bookingsRes, 
            driversRes, 
            vehicleUtilRes, 
            bookingStatusRes,
            recentBookingsRes
            ] = await Promise.all([
            fetch('http://localhost:5000/api/dashboard/stats'),
            fetch(`http://localhost:5000/api/dashboard/bookings-by-day?timeRange=${timeRange}`),
            fetch('http://localhost:5000/api/dashboard/driver-activity'),
            fetch('http://localhost:5000/api/dashboard/vehicle-utilization'),
            fetch(`http://localhost:5000/api/dashboard/booking-status?timeRange=${timeRange}`),
            fetch('http://localhost:5000/api/dashboard/recent-bookings')
            ]);
            
            // Check for response errors
            if (!statsRes.ok) throw new Error(`Stats API error: ${statsRes.status}`);
            if (!bookingsRes.ok) throw new Error(`Bookings API error: ${bookingsRes.status}`);
            if (!driversRes.ok) throw new Error(`Drivers API error: ${driversRes.status}`);
            if (!vehicleUtilRes.ok) throw new Error(`Vehicle API error: ${vehicleUtilRes.status}`);
            if (!bookingStatusRes.ok) throw new Error(`Booking status API error: ${bookingStatusRes.status}`);
            if (!recentBookingsRes.ok) throw new Error(`Recent bookings API error: ${recentBookingsRes.status}`);
            
            // Parse responses
            const statsData = await statsRes.json();
            const bookingsData = await bookingsRes.json();
            const driversData = await driversRes.json();
            const vehicleUtilData = await vehicleUtilRes.json();
            const bookingStatusData = await bookingStatusRes.json();
            const recentBookingsData = await recentBookingsRes.json();
            
            // Update state with fetched data
            setStats(statsData);
            setBookingsPerDay(bookingsData);
            setDriverActivity(driversData);
            setVehicleUtilization(vehicleUtilData);
            setBookingStatus(bookingStatusData);
            setRecentBookings(recentBookingsData);
            
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
        };

        fetchDashboardData();
    }, [timeRange]);

    // Create stat cards from the stats object
    const statCards = [
        { label: "Available Vehicles", value: stats.availableVehicles },
        { label: "Active Bookings", value: stats.activeBookings },
        { label: "Total Drivers", value: stats.totalDrivers },
        { label: "Completed Trips", value: stats.completedTrips },
        { label: "Pending Bookings", value: stats.pendingBookings },
    ];

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-md">
            <p className="font-medium">{`${label}`}</p>
            <p className="text-blue-600 font-bold">{`${payload[0].name}: ${payload[0].value}`}</p>
            </div>
        );
        }
        return null;
    };

    const getTimeRangeTitle = () => {
        switch(timeRange) {
        case 'weekly': return '(Weekly)';
        case 'monthly': return '(Monthly)';
        case 'yearly': return '(Yearly)';
        default: return '';
        }
    };

    // Get chart title based on time range
    const getBookingsChartTitle = () => {
        switch(timeRange) {
        case 'weekly': return 'Bookings Per Day (Weekly)';
        case 'monthly': return 'Bookings Per Month (Monthly)';
        case 'yearly': return 'Bookings Per Year (Yearly)';
        default: return 'Bookings Over Time';
        }
    };

    const getTimeUnitLabel = () => {
        switch(timeRange) {
          case 'weekly': return 'Days';
          case 'monthly': return 'Months';
          case 'yearly': return 'Years';
          default: return 'Time';
        }
      };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
        });
    };

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
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
            <div className="flex items-center bg-white rounded-lg shadow p-2">
              <FilterIcon size={20} className="mr-2 text-gray-500" />
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent border-none text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="ml-3 text-gray-600">Loading dashboard data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <p>Failed to load dashboard data: {error}</p>
              <p className="mt-2">Please check your API connections or try again later.</p>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((card) => (
                  <div key={card.label} className="bg-white rounded-xl shadow p-6 transition-all hover:shadow-lg">
                    <h3 className="text-sm font-medium text-gray-500">{card.label}</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Bookings Per Day - Line Chart */}
                <div className="bg-white rounded-xl shadow p-6 h-96">
                  <h3 className="text-lg font-semibold mb-4">{getBookingsChartTitle()}</h3>
                  {bookingsPerDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={bookingsPerDay} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="timeUnit" 
                          tickFormatter={(value) => value}
                          label={{ value: getTimeUnitLabel(), position: 'insideBottom', dy: 15 }}
                        />
                        <YAxis label={{ value: 'Bookings', angle: -90, position: 'insideLeft', dx: -15 }}
                          allowDecimals={false}
                                
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="bookings" 
                          stroke="#8884d8" 
                          strokeWidth={2} 
                          activeDot={{ r: 8 }} 
                          name="Bookings"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-64">
                      <p className="text-gray-500">No booking data available</p>
                    </div>
                  )}
                </div>

                {/* Driver Activity - Pie Chart */}
                <div className="bg-white rounded-xl shadow p-6 h-96">
                  <h3 className="text-lg font-semibold mb-4">Driver Activity {getTimeRangeTitle()}</h3>
                  {driverActivity.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={driverActivity}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={110}
                          fill="#8884d8"
                          dataKey="bookings"
                          nameKey="driver"
                          label={({ driver, percent }) => `${driver}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {driverActivity.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-64">
                      <p className="text-gray-500">No driver activity data available</p>
                    </div>
                  )}
                </div>

                {/* Vehicle Utilization - Radar Chart */}
                <div className="bg-white rounded-xl shadow p-6 h-96">
                  <h3 className="text-lg font-semibold mb-4">Vehicle Status Distribution {getTimeRangeTitle()}</h3>
                  {vehicleUtilization.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                      <RadarChart outerRadius={90} data={vehicleUtilization}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="status" />
                        <PolarRadiusAxis />
                        <Radar
                          name="Vehicles"
                          dataKey="count"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-64">
                      <p className="text-gray-500">No vehicle utilization data available</p>
                    </div>
                  )}
                </div>

                {/* Booking Status - Bar Chart */}
                <div className="bg-white rounded-xl shadow p-6 h-96">
                  <h3 className="text-lg font-semibold mb-4">Booking Status {getTimeRangeTitle()}</h3>
                  {bookingStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart 
                        data={bookingStatus}
                        margin={{ top: 5, right: 30, bottom: 25, left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="status" 
                          label={{ value: 'Status', position: 'insideBottom', dy: 15 }}
                        />
                        <YAxis 
                          label={{ value: 'Number of Bookings', angle: -90, position: 'insideCenter', dx: -25, }}
                          allowDecimals={false} 
                          tickCount={5}  
                          domain={[0, 'dataMax + 1']}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value} bookings`, '']}
                          labelFormatter={(label) => `Status: ${label}`}
                        />
                        {/* Remove Legend or position it better */}
                        <Bar 
                          dataKey="count" 
                          radius={[10, 10, 0, 0]} 
                          name="Bookings Count"
                        >
                          {bookingStatus.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-64">
                      <p className="text-gray-500">No booking status data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Recent Bookings {getTimeRangeTitle()}</h3>
                  <Link to="/view" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                    <span>View all</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                {recentBookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Scheduled At
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vehicle
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Driver
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {booking.location}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(booking.scheduledAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.vehicle}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.driver}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {booking.user}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-20">
                    <p className="text-gray-500">No recent bookings</p>
                  </div>
                )}
              </div>
            </>
          )}
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