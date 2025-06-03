const { pool } = require("../config/database");

class Booking {
    static async create(bookingData) {
        const {
            business_id,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            service_type,
            booking_date,
            time_slot,
            service_description,
        } = bookingData;

        const query = `
        INSERT INTO bookings (
        business_id, customer_name, customer_email, customer_phone, customer_address, service_type, booking_date, time_slot, service_description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `;

        const values = [
            business_id,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            service_type,
            booking_date,
            time_slot,
            service_description,
        ];

        const result = await pool.query(query, values);
        return result.rows[0]; // return the newly created booking
    }

    // fetch all bookings for a business w/ optional filters for date/status
    static async getByBusinessId(businessId, filter = {}) {
        let query = `
        SELECT * FROM bookings
        WHERE business_id = $1
        `;
        const values = [businessId];
        let paramCount = 1;

        // filter by specific date if provided
        if (filters.date) {
            paramCount++;
            query += ` AND booking_date = $${paramCount}`;
            values.push(filters.date);
        }

        // filter by status if provided
        if (filters.status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            values.push(filters.status);
        }

        // order the results chronologically by date & time
        query += ` ORDER BY booking_date ASC, time_slot ASC`;

        const result = await pool.query(query, values);
        return result.rows;
    }

    // retrieve a specific booking by id
    static async getById(id) {
        const query = "SELECT * FROM bookings WHERE id = $1";
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // update booking status
    static async updateStatus(id, status) {
        const query = `
        UPDATE bookings
        SET status = $1
        WHERE id = $2
        RETURNING *
        `;
        const result = await pool.query(query, [status, id]);
        return result.rows[0]; // return updated booking
    }

    // check if specific time slot is already taken for a business on a given date
    static async isTimeSlotAvailable(businessId, date, timeSlot) {
        const query = `
        SELECT COUNT(*) as count
        FROM bookings
        WHERE business_id = $1
        AND booking_date = $2
        AND time_slot = $3
        AND status NOT IN ('cancelled')
        `;

        const result = await pool.query(query, [businessId, date, timeSlot]);
        return parseInt(result.rows[0].count) === 0; // return true if no active booking exists
    }

    // get bookings for today
    static async getTodaysBookings(businessId) {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        return this.getByBusinessId(businessId, { date: today });
    }

    // get upcoming bookings
    static async getUpcomingBookings(businessId, days = 7) {
        const query = `
            SELECT * FROM bookings
            WHERE business_id = $1
            AND booking_date >= CURRENT_DATE
            AND booking_date <= CURRENT_DATE + INTERVAL '${days} days'
            AND status NOT IN ('cancelled', 'completed')
            ORDER BY booking_date ASC, time_slot ASC
        `;

        const result = await pool.query(query, [businessId]);
        return result.rows;
    }

    // delete booking
    static async delete(id) {
        const query = "DELETE FROM bookings WHERE id = $1 RETURNING *";
        const result = await pool.query(query, [id]);
        return result.rows[0]; // return deleted booking
    }
}

module.exports = Booking;
