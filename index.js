const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(bodyParser.json());

/* CONFIG */
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/bookingdb";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
mongoose.connect(MONGO_URL);

// ---------------------- SCHEMAS ----------------------

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password_hash: String,
    name: String
});

const RoomSchema = new mongoose.Schema({
    name: String,
    location: String,
    capacity: Number,
    price_cents: Number
});

const AvailabilitySchema = new mongoose.Schema({
    room_id: mongoose.Types.ObjectId,
    date: Date,
    available_units: Number
});

const BookingSchema = new mongoose.Schema({
    user_id: mongoose.Types.ObjectId,
    room_id: mongoose.Types.ObjectId,
    start_date: Date,
    end_date: Date,
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Room = mongoose.model("Room", RoomSchema);
const Availability = mongoose.model("Availability", AvailabilitySchema);
const Booking = mongoose.model("Booking", BookingSchema);

// ---------------------- RATE LIMIT ----------------------
app.use(rateLimit({ windowMs: 60000, max: 200 }));

// ---------------------- AUTH MIDDLEWARE ----------------------
function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h) return res.status(401).send({ error: "Missing token" });

    const token = h.split(" ")[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).send({ error: "Invalid token" });
    }
}

// ---------------------- REGISTER ----------------------
app.post("/api/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password)
        return res.status(400).send({ error: "email & password required" });

    try {
        const hash = await bcrypt.hash(password, 10);

        const user = await User.create({
            email,
            password_hash: hash,
            name: name || null
        });

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
            expiresIn: "7d"
        });

        res.status(201).send({ token, user });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).send({ error: "User exists" });

        console.error(err);
        res.status(500).send({ error: "server error" });
    }
});

// ---------------------- LOGIN ----------------------
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).send({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).send({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: "7d"
    });

    res.send({
        token,
        user: { id: user._id, email: user.email, name: user.name }
    });
});

// ---------------------- SEARCH ROOMS ----------------------
app.get("/api/rooms", async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end)
        return res.status(400).send({ error: "start & end required" });

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Aggregate availability
    const rooms = await Availability.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: "$room_id",
                minAvailable: { $min: "$available_units" }
            }
        },
        {
            $match: { minAvailable: { $gt: 0 } }
        },
        {
            $lookup: {
                from: "rooms",
                localField: "_id",
                foreignField: "_id",
                as: "room"
            }
        },
        { $unwind: "$room" },
        {
            $project: {
                id: "$room._id",
                name: "$room.name",
                location: "$room.location",
                capacity: "$room.capacity",
                price_cents: "$room.price_cents",
                available_units: "$minAvailable"
            }
        }
    ]);

    res.send(rooms);
});

// ---------------------- BOOKING ----------------------
app.post("/api/book", auth, async (req, res) => {
    const { room_id, start_date, end_date, quantity } = req.body;
    const userId = req.user.id;
    const qty = parseInt(quantity || 1, 10);

    if (!room_id || !start_date || !end_date)
        return res.status(400).send({ error: "missing fields" });

    // Redis idempotency
    const idemKey = req.header("Idempotency-Key") || null;
    if (idemKey) {
        const prev = await redis.get(`idem:${idemKey}`);
        if (prev) return res.status(200).send({ id: prev, idempotent: true });
    }

    // Redis lock
    const lockKey = `lock:room:${room_id}`;
    const token = uuidv4();
    const lock = await redis.set(lockKey, token, "PX", 5000, "NX");
    if (!lock) return res.status(423).send({ error: "Resource busy" });

    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const s = new Date(start_date);
        const e = new Date(end_date);
        const days = [];
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        // Decrement availability
        for (const date of days) {
            const updated = await Availability.updateOne(
                {
                    room_id: room_id,
                    date,
                    available_units: { $gte: qty }
                },
                { $inc: { available_units: -qty } }
            ).session(session);

            if (updated.modifiedCount === 0) {
                await session.abortTransaction();
                return res
                    .status(409)
                    .send({ error: `Insufficient availability for date ${date}` });
            }
        }

        const booking = await Booking.create(
            [
                {
                    user_id: userId,
                    room_id,
                    start_date,
                    end_date
                }
            ],
            { session }
        );

        await session.commitTransaction();

        if (idemKey) {
            await redis.set(`idem:${idemKey}`, booking[0]._id, "EX", 86400);
        }

        res.status(201).send({ booking: booking[0] });
    } catch (err) {
        console.error(err);
        await session.abortTransaction();
        res.status(500).send({ error: "server error" });
    } finally {
        session.endSession();

        const cur = await redis.get(lockKey);
        if (cur === token) await redis.del(lockKey);
    }
});

app.listen(4000, () => console.log("Listening on port 4000"));
