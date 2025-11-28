import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { getRoomById, getAvailability, createBooking } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/BookingForm.css';

function BookingForm() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [purpose, setPurpose] = useState('');
  const [attendees, setAttendees] = useState(1);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (date) {
      fetchAvailability();
    }
  }, [date, roomId]);

  const fetchRoom = async () => {
    try {
      const data = await getRoomById(roomId);
      setRoom(data);
      setAttendees(Math.min(1, data.capacity));
    } catch (err) {
      setError('Failed to load room details.');
    }
  };

  const fetchAvailability = async () => {
    try {
      const data = await getAvailability(roomId, date, date);
      setAvailability(data);
    } catch (err) {
      console.error('Failed to fetch availability:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!room) {
      setError('Room information not loaded.');
      setLoading(false);
      return;
    }

    if (attendees > room.capacity) {
      setError(`Number of attendees exceeds room capacity (${room.capacity})`);
      setLoading(false);
      return;
    }

    try {
      const bookingData = {
        userId: user.userId,
        roomId: roomId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        purpose: purpose,
        attendees: parseInt(attendees),
      };

      await createBooking(bookingData);
      setSuccess('Booking created successfully!');
      
      setTimeout(() => {
        navigate('/bookings');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  };

  if (!room) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="booking-form-container">
      <header className="page-header">
        <h1>Book {room.name}</h1>
        <button onClick={() => navigate('/rooms')}>Back to Rooms</button>
      </header>

      <div className="booking-form-content">
        <div className="room-info">
          <h2>Room Details</h2>
          <p>{room.description}</p>
          <p><strong>Capacity:</strong> {room.capacity} people</p>
          <p><strong>Floor:</strong> {room.floor}</p>
          <p><strong>Amenities:</strong> {room.amenities.join(', ')}</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <h2>Booking Information</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 90), 'yyyy-MM-dd')}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time</label>
              <input
                type="time"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time</label>
              <input
                type="time"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="attendees">Number of Attendees</label>
            <input
              type="number"
              id="attendees"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              min="1"
              max={room.capacity}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="purpose">Purpose</label>
            <textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Enter the purpose of your booking"
              rows="4"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating Booking...' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BookingForm;
