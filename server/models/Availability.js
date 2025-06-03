const { pool } = require("../config/database");

class Availability {
    // get availability for a business
    static async getByBusinessId(businessId) {
        const query = `
            SELECT * FROM availability
            WHERE business_id = $1
            ORDER BY day_of_week ASC
            `;
        const result = await pool.query(query, [businessId]);
        return result.rows;
    }

    // get availability for a specific day
    static async getByBusinessAndDay(businessId, dayOfWeek) {
        const query = `
            SELECT * FROM availability
            WHERE business_id = $1 AND day_of_week = $2
            `;
        const result = await pool.query(query, [businessId, dayOfWeek]);
        return result.rows[0];
    }

    // update availability for a specific day
    static async updateDay(businessId, dayOfWeek, availabilityData) {
        const { morning_available, afternoon_available, evening_available } =
            availabilityData;

        const query = `
            INSERT INTO availability (business_id, day_of_week, mroning_available, afternoon_available, evening_available)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (business_id, day_of_week)
            DO UPDATE SET
                morning_available = EXCLUDED.morning_available,
                afternoon_available = EXCLUDED.afternoon_available,
                evening_available = EXCLUDED.evening_available
            RETURNING *
        `;

        const values = [
            businessId,
            dayOfWeek,
            morning_available,
            afternoon_available,
            evening_available,
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // get available time slots for a specific date
    static async getAvailableTimeSlots(businessId, date) {
        const dayOfWeek = new Date(date).getDay();

        // get business availability for day
        const availability = await this.getByBusinessAndDay(
            businessId,
            dayOfWeek
        );

        if (!availability) {
            return [];
        }

        // get existing bookings for the date
        const bookingsQuery = `
            SELECT time_slot FROM bookings
            WHERE business_id = $1
                AND booking_date = $2
                AND status NOT IN ('cancelled')
        `;

        const bookingsResult = await pool.query(bookingsQuery, [
            businessId,
            date,
        ]);
        const bookedSlots = bookingsResult.rows.map((row) => row.time_slot);

        // build available slots
        const availableSlots = [];

        if (
            availability.morning_available &&
            !bookedSlots.includes("morning")
        ) {
            availableSlots.push("morning");
        }

        if (
            availability.afternoon_available &&
            !bookedSlots.includes("afternoon")
        ) {
            availableSlots.push("afternoon");
        }

        if (
            availability.evening_available &&
            !bookedSlots.includes("evening")
        ) {
            availableSlots.push("evening");
        }

        return availableSlots;
    }

    // get available dates for next N days
    static async getAvailableDates(businessId, days = 30) {
        const availability = await this.getByBusinessId(businessId);
        const availableDays = availability
            .filter(
                (day) =>
                    day.morning_available ||
                    day.afternoon_available ||
                    day.evening_available
            )
            .map((day) => day.day_of_week);

        if (availableDays.length === 0) {
            return [];
        }

        const availableDates = [];
        const today = new Date();

        for (let i = 1; i <= days; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);

            const dayOfWeek = checkDate.getDay();

            if (availableDays.includes(dayOfWeek)) {
                const dateString = checkDate.toISOString().split("T")[0];
                const availableSlots = await this.getAvailableTimeSlots(
                    businessId,
                    dateString
                );

                if (availableSlots.length > 0) {
                    availableDates.push({
                        date: dateString,
                        dayOfWeek: dayOfWeek,
                        availableSlots: availableSlots,
                    });
                }
            }
        }

        return availableDates;
    }

    // set default availability (all days closed)
    static async setDefaultAvailability(businessId) {
        const days = [0, 1, 2, 3, 4, 5, 6]; // sunday to saturday
        const results = [];

        for (const day of days) {
            const result = await this.updateDay(businessId, day, {
                morning_available: false,
                afternoon_available: false,
                evening_available: false,
            });
            results.push(result);
        }

        return results;
    }
}

module.exports = Availability;
