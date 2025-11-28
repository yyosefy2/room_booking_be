import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRooms } from '../services/api';
import '../styles/RoomList.css';

function RoomList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await getRooms();
      setRooms(data);
    } catch (err) {
      setError('Failed to load rooms. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading rooms...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="room-list-container">
      <header className="page-header">
        <h1>Available Rooms</h1>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </header>

      <div className="rooms-grid">
        {rooms.map((room) => (
          <div key={room._id} className="room-card">
            <h3>{room.name}</h3>
            <p className="room-description">{room.description}</p>
            
            <div className="room-details">
              <div className="detail-item">
                <strong>Capacity:</strong> {room.capacity} people
              </div>
              <div className="detail-item">
                <strong>Floor:</strong> {room.floor}
              </div>
              <div className="detail-item">
                <strong>Amenities:</strong> {room.amenities.join(', ')}
              </div>
            </div>

            <button 
              className="book-button"
              onClick={() => navigate(`/book/${room._id}`)}
            >
              Book this Room
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomList;
