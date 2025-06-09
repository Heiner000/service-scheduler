const { Pool } = require("pg");
require("dotenv").config();

// configure postgresql connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
});

// test db connection
pool.on("connect", () => {
    console.log("Connected to PostgreSQL database ....");
});

// catch unexpected errors on idle clients to prevent silent crashes
pool.on("error", (err) => {
    console.error("Unexpected error on idle client ...", err);
    process.exit(-1);
});

// create required tables if they don't already exist
const initializeDatabase = async () => {
    try {
        console.log(" . . . creating businesses table . . . ");
        // create 'businesses' table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS businesses (
                id SERIAL PRIMARY KEY,
                business_name VARCHAR(255) NOT NULL,
                owner_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20),
                service_types JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log(" . . . creating availability table . . . ");
        // create 'availability' table to track business working hours per weekday
        await pool.query(`
            CREATE TABLE IF NOT EXISTS availability (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
                day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
                morning_available BOOLEAN DEFAULT true,
                afternoon_available BOOLEAN DEFAULT true,
                evening_available BOOLEAN DEFAULT true,
                UNIQUE(business_id, day_of_week)
            );
        `);

        console.log(" . . . creating bookings table . . . ");
        // creates 'bookings' table for customer appointments, linked to businesses
        // includes status & time slot checks for data consistency
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(20),
                customer_address TEXT,
                service_type VARCHAR(255) NOT NULL,
                booking_date DATE NOT NULL,
                time_slot VARCHAR(20) CHECK (time_slot IN ('morning', 'afternoon', 'evening')),
                service_description TEXT,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Database tables initialized successfully!!");
    } catch (error) {
        console.error("Error initializing database .... : ", error);
        throw error;
    }
};

// seeds database with a default business & default availability if none present
const seedInitialData = async () => {
    try {
        // check if a business w/ default email already exists
        const existingBusiness = await pool.query(
            "SELECT id FROM businesses WHERE email = $1",
            [process.env.DEFAULT_BUSINESS_EMAIL || "garrett@example.com"]
        );

        // if not, insert a default business and set weekend availability
        if (existingBusiness.rows.length === 0) {
            // insert the business and return its generated ID
            const businessResult = await pool.query(
                `
                INSERT INTO businesses (business_name, owner_name, email, phone, service_types)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
                `,
                [
                    process.env.DEFAULT_BUSINESS_NAME || "Soft Water Services",
                    "Garrett",
                    process.env.DEFAULT_BUSINESS_EMAIL || "garrett.example.com",
                    "555-0123",
                    JSON.stringify([
                        "Water Softener Installation",
                        "Water Softener Repair",
                        "Water Softener Maintenance",
                        "Water Quality Testing",
                        "Salt Delivery",
                    ]),
                ]
            );

            const businessId = businessResult.rows[0].id;

            // Define availability for each day of the week
            const availabilityData = [
                { day: 0, morning: false, afternoon: true, evening: true }, // Sunday
                { day: 1, morning: true, afternoon: true, evening: false }, // Monday
                { day: 2, morning: true, afternoon: true, evening: false }, // Tuesday
                { day: 3, morning: true, afternoon: true, evening: false }, // Wednesday
                { day: 4, morning: true, afternoon: true, evening: false }, // Thursday
                { day: 5, morning: true, afternoon: true, evening: false }, // Friday
                { day: 6, morning: true, afternoon: true, evening: true }, // Saturday
            ];

            // Insert the availability records into the DB
            for (const avail of availabilityData) {
                await pool.query(
                    `
                        INSERT INTO availability (business_id, day_of_week, morning_available, afternoon_available, evening_available)
                        VALUES ($1, $2, $3, $4, $5)
                        `,
                    [
                        businessId,
                        avail.day,
                        avail.morning,
                        avail.afternoon,
                        avail.evening,
                    ]
                );
            }

            console.log("Initial business data seeded successfully");
        } else {
            console.log("Initial business data already exists ..... ! ");
        }
    } catch (error) {
        console.error("Error seeding initial data ... :", error);
        throw error;
    }
};

module.exports = {
    pool,
    initializeDatabase,
    seedInitialData,
};
