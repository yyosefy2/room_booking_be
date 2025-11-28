# Room Booking System - Quick Reference Guide

## Quick Start

### Start the System
```bash
# Production
docker compose up -d --build

# Development (with hot-reload)
docker compose -f docker-compose.dev.yml up -d --build
```

### Stop the System
```bash
docker compose down

# Remove all data
docker compose down -v
```

---

## Docker Commands

### Service Management
```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Rebuild a service
docker compose up -d --build backend

# Execute command in container
docker compose exec backend npm run seed
docker compose exec mongodb mongosh bookingdb
```

### Cleanup
```bash
# Stop and remove containers
docker compose down

# Remove volumes (deletes all data!)
docker compose down -v

# Remove images
docker compose down --rmi all

# Full cleanup
docker system prune -a --volumes
```

---

## NPM Scripts

### Application Scripts
```bash
# Production
npm start                  # Start server

# Development
npm run dev               # Start with nodemon (auto-reload)
```

### Database Scripts
```bash
# Seeding
npm run seed              # Populate database with test data

# Maintenance
npm run db:check          # Database health check
npm run db:indexes        # Show index information
npm run db:stats          # Collection statistics
npm run db:verify         # Verify data consistency
npm run db:cleanup        # Clean up old/invalid data
npm run db:cleanup-live   # Interactive cleanup
npm run db:ensure-availability  # Ensure availability records
npm run db:all            # Run all checks
```

---

## API Endpoints

### Base URL
```
http://localhost:4000
```

### Health Check
```bash
GET /alive
# Response: {"status":"alive"}
```

### Authentication

#### Register
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Response: { "token": "jwt_token_here", "user": {...} }
```

### Rooms

#### List All Rooms
```bash
GET /rooms
```

#### Search Rooms
```bash
GET /rooms/search?start_date=2025-12-01&end_date=2025-12-05&capacity=4&location=Building%20A

# Query Parameters:
# - start_date (required): YYYY-MM-DD
# - end_date (required): YYYY-MM-DD
# - capacity (optional): minimum capacity
# - location (optional): room location
```

#### Get Room Details
```bash
GET /rooms/:roomId
```

#### Get Room Availability
```bash
GET /rooms/:roomId/availability?start_date=2025-12-01&end_date=2025-12-31
```

### Bookings

#### Create Booking
```bash
POST /bookings
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "room_id": "60d5ec49f1b2c8b1f8e4e1a1",
  "start_date": "2025-12-01",
  "end_date": "2025-12-05",
  "guest_count": 3,
  "notes": "Optional booking notes"
}
```

#### Get User's Bookings
```bash
GET /bookings
Authorization: Bearer YOUR_JWT_TOKEN

# Query Parameters:
# - status (optional): active, cancelled, all
```

#### Get Booking Details
```bash
GET /bookings/:bookingId
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Cancel Booking
```bash
DELETE /bookings/:bookingId
Authorization: Bearer YOUR_JWT_TOKEN
```

### User Profile

#### Get Current User
```bash
GET /users/me
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## cURL Examples

### Register and Login
```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Search and Book
```bash
# Search rooms
curl "http://localhost:4000/rooms/search?start_date=2025-12-01&end_date=2025-12-05&capacity=2"

# Create booking (replace TOKEN with your JWT)
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "room_id": "ROOM_ID_HERE",
    "start_date": "2025-12-01",
    "end_date": "2025-12-05",
    "guest_count": 2
  }'

# View my bookings
curl http://localhost:4000/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Cancel booking
curl -X DELETE http://localhost:4000/bookings/BOOKING_ID_HERE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Database Direct Access

### MongoDB
```bash
# Connect to MongoDB container
docker compose exec mongodb mongosh bookingdb

# Common queries
db.users.find().pretty()
db.rooms.find({ is_active: true }).pretty()
db.bookings.find({ status: 'active' }).pretty()
db.availability.find({ room_id: ObjectId('...') })

# Count documents
db.users.countDocuments()
db.bookings.countDocuments({ status: 'active' })

# Exit
exit
```

### Redis
```bash
# Connect to Redis container
docker compose exec redis redis-cli

# Common commands
KEYS *                    # List all keys
GET key_name             # Get value
TTL key_name             # Check TTL
FLUSHDB                  # Clear database (careful!)

# Exit
exit
```

---

## Environment Variables

### Production Configuration
```bash
# .env file or docker-compose environment
PORT=4000
NODE_ENV=production
MONGODB_URL=mongodb://mongodb:27017/bookingdb
REDIS_URL=redis://redis:6379
JWT_SECRET=your-production-secret-here
```

### Development Configuration
```bash
# Use defaults from config/config.json
PORT=4000
NODE_ENV=development
```

---

## Common Issues & Solutions

### Backend won't start
```bash
# Check if MongoDB and Redis are running
docker compose ps

# Check backend logs
docker compose logs backend

# Restart backend
docker compose restart backend
```

### Connection refused errors
```bash
# Ensure all services are healthy
docker compose ps

# Check network
docker network ls
docker network inspect room_booking_be_room-booking-network
```

### Port already in use
```bash
# Check what's using the port
netstat -ano | findstr :4000

# Stop the service or change port in docker-compose.yml
```

### Database is empty
```bash
# Seed the database
docker compose exec backend npm run seed

# Verify data
docker compose exec mongodb mongosh bookingdb --eval "db.rooms.countDocuments()"
```

### Clear all data and restart
```bash
# Stop and remove everything
docker compose down -v

# Start fresh
docker compose up -d --build

# Seed database
docker compose exec backend npm run seed
```

---

## Performance Monitoring

### Container Resources
```bash
# Real-time resource usage
docker stats

# Container details
docker compose ps
docker inspect room-booking-backend
```

### Application Logs
```bash
# Follow all logs
docker compose logs -f

# Follow specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Database Performance
```bash
# Check indexes
docker compose exec backend npm run db:indexes

# Collection stats
docker compose exec backend npm run db:stats

# MongoDB slow queries
docker compose exec mongodb mongosh bookingdb --eval "db.setProfilingLevel(2)"
```

---

## Testing Workflow

### 1. Start System
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### 2. Seed Data
```bash
docker compose exec backend npm run seed
```

### 3. Test Authentication
```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Tester"}'

# Login (save the token)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### 4. Test Booking Flow
```bash
# Search rooms
curl "http://localhost:4000/rooms/search?start_date=2025-12-10&end_date=2025-12-15"

# Create booking with the room_id from search results
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"room_id":"ROOM_ID","start_date":"2025-12-10","end_date":"2025-12-15","guest_count":2}'

# View bookings
curl http://localhost:4000/bookings -H "Authorization: Bearer YOUR_TOKEN"
```

---

## File Structure Reference

```
room_booking_be/
├── docker-compose.yml           # Production compose
├── docker-compose.dev.yml       # Development compose
├── package.json                 # Root package file
├── ARCHITECTURE.md              # Full architecture docs
├── QUICK_REFERENCE.md          # This file
│
└── be_ms/                       # Backend microservice
    ├── Dockerfile               # Container definition
    ├── package.json             # Backend dependencies
    ├── README.md                # Source code structure
    │
    ├── config/
    │   ├── config.json          # Application config
    │   └── schema.json          # Request validation schemas
    │
    └── src/
        ├── server.js            # Entry point
        ├── api.js               # API routes & logic
        │
        ├── mongodb/
        │   ├── index.js         # Schemas & models
        │   ├── seed.js          # Database seeding
        │   ├── dbUtils.js       # Maintenance utilities
        │   └── MONGODB_SCHEMA.md # Schema documentation
        │
        └── redis/
            └── index.js         # Redis connection & utilities
```

---

## Configuration Files

### config/config.json
```json
{
  "server": { "port": 4000 },
  "jwt": { "secret": "...", "expiresIn": "7d" },
  "database": {
    "mongodb": { "url": "..." },
    "redis": { "url": "..." }
  },
  "security": {
    "bcrypt": { "saltRounds": 10 },
    "rateLimit": { "windowMs": 60000, "max": 200 }
  }
}
```

### config/schema.json
Contains JSON Schema definitions for:
- RegisterRequest
- LoginRequest
- BookingRequest
- SearchRoomsQuery

---

## Rate Limiting

- **Window**: 60 seconds
- **Max Requests**: 200 per window
- **Response**: 429 Too Many Requests when exceeded

---

## Data Validation Rules

### Dates
- Format: `YYYY-MM-DD`
- Start date: Cannot be in the past
- End date: Must be after start date
- Max booking duration: 365 days

### Room Search
- start_date: Required
- end_date: Required
- capacity: Optional, minimum 1
- location: Optional, string

### Booking
- room_id: Required, valid ObjectId
- start_date: Required, valid date
- end_date: Required, valid date
- guest_count: Required, >= 1
- notes: Optional, max 500 characters

### User Registration
- email: Required, valid email format
- password: Required, min 6 characters
- name: Optional, max 100 characters

---

## Useful MongoDB Queries

```javascript
// Find available rooms for a date range
db.availability.aggregate([
  { $match: { date: { $gte: ISODate("2025-12-01"), $lte: ISODate("2025-12-05") } } },
  { $group: { _id: "$room_id", available_days: { $sum: { $cond: ["$is_available", 1, 0] } } } },
  { $match: { available_days: 5 } }
])

// Find user's active bookings
db.bookings.find({ user_id: ObjectId("..."), status: "active" })

// Room booking statistics
db.bookings.aggregate([
  { $group: { _id: "$room_id", total_bookings: { $sum: 1 }, total_revenue: { $sum: "$total_price_cents" } } },
  { $sort: { total_bookings: -1 } }
])
```

---

## Security Best Practices

### In Production
- [ ] Change JWT_SECRET to a strong random value
- [ ] Enable MongoDB authentication
- [ ] Enable Redis authentication
- [ ] Use HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Implement backup strategy

### Environment Security
```bash
# Never commit secrets to git
echo ".env" >> .gitignore

# Use strong passwords
# Use environment variables for secrets
# Rotate JWT secrets periodically
```

---

## Backup & Restore

### Backup
```bash
# MongoDB backup
docker compose exec mongodb mongodump --out=/backup --db=bookingdb
docker cp room-booking-mongodb:/backup ./backup-$(date +%Y%m%d)

# Redis backup
docker compose exec redis redis-cli SAVE
docker cp room-booking-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Restore
```bash
# MongoDB restore
docker cp ./backup room-booking-mongodb:/backup
docker compose exec mongodb mongorestore --db=bookingdb /backup/bookingdb

# Redis restore
docker cp ./dump.rdb room-booking-redis:/data/dump.rdb
docker compose restart redis
```

---

## Support & Documentation

- **Full Architecture**: See `ARCHITECTURE.md`
- **Schema Details**: See `be_ms/src/mongodb/MONGODB_SCHEMA.md`
- **Source Structure**: See `be_ms/README.md`
- **API Schemas**: See `be_ms/config/schema.json`

---

**Version:** 1.0.0  
**Last Updated:** November 27, 2025
