const {
    pool,
    initializeDatabase,
    seedInitialData,
} = require("./server/config/database");
const Business = require("./server/models/Business");
const Availability = require("./server/models/Availability");
const Booking = require("./server/models/Booking");

async function testDatabaseSetup() {
    try {
        console.log(" 🔧 ... Setting up database ... ");

        // init database
        await initializeDatabase();
        console.log(" ✅ .... Database tables created .... ");

        // seed default data
        await seedInitialData();
        console.log(" ✅ ... Initial data seeded ... ");

        // test business model
        const businesses = await Business.getAll();
        console.log(` ✅ ... Found ${business.length} business(es)`);

        if (businesses.length > 0) {
            const business = business[0];
            console.log(` 📊 ... Business: ${business.business_name}`);
            console.log(` 📧 ... Email: ${business.email}`);
            console.log(
                ` 🛠️ ... Services: ${JSON.stringify(business.service_types)}`
            );

            // test availability
            const availability = await Availability.getByBusinessId(
                business.id
            );
            console.log(
                ` 📅 .... Availability settings: ${availability.length} days configured`
            );

            // test available dates
            const availableDates = await Availability.getAvailableDates(
                business.id,
                7
            );
            console.log(
                ` 📅 .... Available dates in next 7 days: ${availableDates.length}`
            );

            if (availableDates.length > 0) {
                console.log(" Next available date: ", availableDates[0]);
            }

            // test booking creation
            /*
            const testBooking = await Booking.create({
                business_id: business.id,
                customer_name: 'Test Customer',
                customer_email: 'test@example.com',
                customer_phone: '555-1234'
                customer_address: '123 Test St, Testicity',
                service_type: 'Water Softner Service',
                booking_date: availableDates[0]?.date || '2025-12-01',
                time_slot: 'morning',
                service_description: 'Test booking for setup verification'
            });
            console.log(' ✅  ~ ~ ~ Test booking created: ', testBooking.id);
            */
        }
        console.log("\n 🎉 ~ Database setup completed successfully! ~");
        console.log("~ ready to run dev ~");
    } catch (error) {
        console.error("❌ D A T A B A S E  S E T U P  F A I L E D: ", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run setup if file executed directly
if (require.main === module) {
    testDatabaseSetup();
}
