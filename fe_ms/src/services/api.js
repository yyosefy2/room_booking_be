import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const login = async (email, password) => {
  const response = await api.post('/api/v1/users/login', { email, password });
  return response.data;
};

export const register = async (email, password, name) => {
  const response = await api.post('/api/v1/users/register', { email, password, name });
  return response.data;
};

// Rooms API
export const getRooms = async () => {
  const response = await api.get('/api/v1/rooms/search');
  return response.data;
};

export const getRoomById = async (roomId) => {
  const response = await api.get(`/api/v1/rooms/${roomId}`);
  return response.data;
};

// Availability API
export const getAvailability = async (roomId, startDate, endDate) => {
  const response = await api.get(`/api/v1/rooms/${roomId}/availability`, {
    params: { startDate, endDate },
  });
  return response.data;
};

// Bookings API
export const createBooking = async (bookingData) => {
  const response = await api.post('/api/v1/booking', bookingData);
  return response.data;
};

export const getUserBookings = async (userId) => {
  const response = await api.get('/api/v1/bookings', {
    params: { userId },
  });
  return response.data;
};

export const getBookingById = async (bookingId) => {
  const response = await api.get(`/api/v1/bookings/${bookingId}`);
  return response.data;
};

export const cancelBooking = async (bookingId) => {
  const response = await api.patch(`/api/v1/bookings/${bookingId}/cancel`);
  return response.data;
};

export default api;
