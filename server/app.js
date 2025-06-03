const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// import db setup w/ seeding logic
const { initializeDatabase, seedInitialData } = require("./config/database");
const { timeStamp } = require("console");
const { uptime } = require("process");

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
// HTTP headers
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdn.jsdelivr.net",
                ],
                scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
    })
);

// rate limits
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute time window
    max: 100, // max number per IP per window
    message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// CORS config
app.use(
    cors({
        origin:
            process.env.NODE_ENV === "production"
                ? ["https://service-scheduler.com"]
                : ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true, // allow cookies/auth headers to be sent with requests
    })
);

// parse JSON w/ size limit
app.use(express.json({ limit: "10mb" }));

// parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// serve static assets from the 'public' folder
app.use(express.static(path.join(__dirname, "../public")));

// ROUTES
// root route
app.get("/", (req, res) => {
    res.json({
        message: "Service Scheduler API",
        version: "1.0.0",
        status: "running",
        timestamp: new Date().toISOString(),
    });
});

// health check for uptime monitoring
app.get("/health", (req, res) => {
    res.json({
        status: "health",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(), // secs since app started
    });
});

// app.use('/api/bookings', require('./routes/bookings'));
// app.use('/api/businesses', require('./routes/businesses'));
// app.use('/api/availability', require('./routes/availability'));

// error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Uhmmm... something went wrong...!",
        message:
            process.env.NODE_ENV === "development"
                ? err.message
                : "Internal server error",
    });
});

// 404 handling
app.use("*", (req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
    });
});

// initialize db schema, seed starter data, then start server
const startServer = async () => {
    try {
        console.log("Initializing database . . . ");
        await initializeDatabase();

        console.log("Seeding initial data . . . ");
        await seedInitialData();

        app.listi(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} `);
            console.log(
                `📊 Environment: ${process.env.NODE_ENV || "development"}`
            );
            console.log(`🌐 Local: http://localhost: ${PORT}`);
        });
    } catch (error) {
        console.error("Server start  F A I L E D !");
        process.exit(1);
    }
};

// handling shutdown like a boss
process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    process.exit(0);
});

process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully");
    process.exit(0);
});

startServer();
