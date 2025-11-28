import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Room Booking Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={() => navigate('/rooms')}>
            <h2>Browse Rooms</h2>
            <p>View available rooms and their amenities</p>
          </div>

          <div className="dashboard-card" onClick={() => navigate('/bookings')}>
            <h2>My Bookings</h2>
            <p>View and manage your bookings</p>
          </div>

          <div className="dashboard-card" onClick={() => navigate('/availability')}>
            <h2>Check Availability</h2>
            <p>Find available rooms by date and time</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
