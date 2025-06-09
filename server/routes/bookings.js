const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Availability = require("../models/Availability");

// validation middleware for booking data
const validateBookingData = (req, res, next) => {
    const {
        business_id,
        customer_name,
        customer_email,
        service_type,
        booking_date,
        time_slot,
    } = req.body;

    // check required fields
    if (
        !business_id ||
        !customer_name ||
        !customer_email ||
        !service_type ||
        !booking_date ||
        !time_slot
    ) {
        return res.status(400).json({
            error: "Missing required fields",
            required: [
                "business_id",
                "customer_name",
                "customer_email",
                "service_type",
                "booking_date",
                "time_slot",
            ],
        });
    }

    // validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
        return res.status(400).json({
            error: "Invalid email format",
        });
    }

    // validate time slot
    const validTimeSlots = ["morning", "afternoon", "evening"];
    if (!validTimeSlots.includes(time_slot)) {
        return res.status(400).json({
            error: "Invalid time slot",
            validOptions: validTimeSlots,
        });
    }

    // validate date format & make sure it's not in the past
    const bookingDate = new Date(booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(bookingDate.getTime())) {
        return res.status(400).json({
            error: "Invalid date format. Use YYYY-MM-DD",
        });
    }

    if (bookingDate < today) {
        return res.status(400).json({
            error: "Cannot book appointments in the past",
        });
    }

    next();
};

// POST /api/bookings - create a new booking
router.post("/", validateBookingData, async (req, res) => {
    try {
        const { business_id, booking_date, time_slot } = req.body;

        // check if time slot is available
        const isAvailable = await Booking.isTimeSlotAvailable(
            business_id,
            booking_date,
            time_slot
        );

        if (!isAvailable) {
            return res.status(409).json({
                error: "Time slot is already booked",
                message: `${time_slot} slot on ${booking_date} is not available`,
            });
        }

        // check if business is available on this day/time
        const availableSlots = await Availability.getAvailableTimeSlots(
            business_id,
            booking_date
        );

        if (!availableSlots.includes(time_slot)) {
            return res.status(400).json({
                error: "Business is not available at this time",
                availableSlots: availableSlots,
            });
        }

        // create the booking
        const newBooking = await Booking.create(req.body);

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking: newBooking,
        });
    } catch (error) {
        console.error("Error creating booking: ", error);
        res.status(500).json({
            error: "Failed to create booking",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET /api/bookings/:businessId - get all bookings for a business
router.get("/:businessId", async (req, res) => {
    try {
        const { businessId } = req.params;
        const { date, status } = req.query;

        // build filter object
        const filters = {};
        if (date) filters.date = date;
        if (status) filters.status = status;

        const bookings = await Booking.getByBusinessId(businessId, filters);

        res.json({
            success: true,
            count: bookings.length,
            bookings: bookings,
        });
    } catch (error) {
        console.error("Error fetching bookings: ", error);
        res.status(500).json({
            error: "Failed to fetch bookings",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET /api/bookings/:businessId/today - get today's bookings
router.get("/:businessId/today", async (req, res) => {
    try {
        const { businessId } = req.params;
        const todaysBookings = await Booking.getTodaysBookings(businessId);

        res.json({
            success: true,
            date: new Date().toISOString().split("T")[0],
            count: todaysBookings.length,
            bookings: todaysBookings,
        });
    } catch (error) {
        console.error("Error fetching today's bookings: ", error);
        res.status(500).json({
            error: "Failed to fetch today's bookings",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET /api/bookings/:businessId/upcoming - get upcoming bookings
router.get("/:businessId/upcoming", async (req, res) => {
    try {
        const { businessId } = req.params;
        const { days = 7 } = req.query;

        const upcomingBookings = await Booking.getUpcomingBookings(
            businessId,
            parseInt(days)
        );

        res.json({
            success: true,
            days: parseInt(days),
            count: upcomingBookings.length,
            bookings: upcomingBookings,
        });
    } catch (error) {
        console.error("Error fetching upcoming bookings: ", error);
        res.status(500).json({
            error: "Failed to fetch upcoming bookings",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// PUT /api/bookings/:id/status - update booking status
router.put("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // validate status
        const validStatuses = [
            "pending",
            "confirmed",
            "completed",
            "cancelled",
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: "Invalid status",
                validOptions: validStatuses,
            });
        }

        // check if booking exists
        const existingBooking = await Booking.getById(id);
        if (!existingBooking) {
            return res.status(404).json({
                error: "Booking not found",
            });
        }

        // update the status
        const updatedBooking = await Booking.updateStatus(id, status);

        res.json({
            success: true,
            message: `Booking status updated to ${status}`,
            booking: updatedBooking,
        });
    } catch (error) {
        console.error("Error updating booking status: ", error);
        res.status(500).json({
            error: "Failed to update booking status",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET  /api/bookings/single/:id - get a specific booking
router.get("/single/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.getById(id);

        if (!booking) {
            return res.status(404).json({
                error: "Booking not found",
            });
        }

        res.json({
            success: true,
            booking: booking,
        });
    } catch (error) {
        console.error("Error fetching booking : ", error);
        res.status(500).json({
            error: "Failed to fetch booking",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// DELETE /api/bookings/:id - delete a booking
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // check if booking exists
        const existingBooking = await Booking.getById(id);
        if (!existingBooking) {
            return res.status(404).json({
                error: "Booking not found",
            });
        }

        const deletedBooking = await Booking.delete(id);

        res.json({
            success: true,
            message: "Booking deleted successfully",
            booking: deletedBooking,
        });
    } catch (error) {
        console.error("Error deleting booking : ", error);
        res.status(500).json({
            error: "Failed to delete booking",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

module.exports = router;
