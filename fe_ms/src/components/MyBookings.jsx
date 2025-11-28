import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getUserBookings, cancelBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/MyBookings.css';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await getUserBookings(user.userId);
      setBookings(data);
    } catch (err) {
      setError('Failed to load bookings.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await cancelBooking(bookingId);
      setBookings(bookings.filter(b => b._id !== bookingId));
    } catch (err) {
      alert('Failed to cancel booking: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status.toLowerCase()}`;
  };

  if (loading) {
    return <div className="loading">Loading bookings...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="my-bookings-container">
      <header className="page-header">
        <h1>My Bookings</h1>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </header>

      {bookings.length === 0 ? (
        <div className="no-bookings">
          <p>You don't have any bookings yet.</p>
          <button onClick={() => navigate('/rooms')}>Browse Rooms</button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-header">
                <h3>{booking.roomId?.name || 'Room'}</h3>
                <span className={getStatusClass(booking.status)}>
                  {booking.status}
                </span>
              </div>

              <div className="booking-details">
                <p><strong>Date:</strong> {format(new Date(booking.date), 'MMM dd, yyyy')}</p>
                <p><strong>Time:</strong> {booking.startTime} - {booking.endTime}</p>
                <p><strong>Purpose:</strong> {booking.purpose}</p>
                <p><strong>Attendees:</strong> {booking.attendees}</p>
                {booking.roomId?.floor && (
                  <p><strong>Floor:</strong> {booking.roomId.floor}</p>
                )}
              </div>

              {booking.status === 'confirmed' && (
                <button 
                  className="cancel-button"
                  onClick={() => handleCancel(booking._id)}
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBookings;
