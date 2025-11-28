# Room Booking Frontend

React frontend for the room booking system.

## Features

- User authentication (login)
- Browse available rooms
- Create bookings
- View and manage bookings
- Real-time availability checking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update the API URL in `.env` if needed (default: http://localhost:4000)

4. Start development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Demo Credentials

- Email: admin@example.com
- Password: Admin123!

## Project Structure

```
fe_ms/
├── src/
│   ├── components/       # React components
│   ├── context/          # Context providers (Auth)
│   ├── services/         # API services
│   ├── styles/           # CSS files
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── public/               # Static assets
├── index.html            # HTML template
└── package.json          # Dependencies
```
