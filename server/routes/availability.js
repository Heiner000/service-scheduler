const express = require("express");
const router = express.Router();
const Availability = require("../models/Availability");

// GET /api/availability/:businessId - get business availability settings
router.get("/:businessId", async (req, res) => {
    try {
        const { businessId } = req.params;
        const availability = await Availability.getByBusinessId(businessId);

        if (!availability || availability.length === 0) {
            return res.status(404).json({
                error: "No availability settings for this business",
            });
        }

        res.json({
            success: true,
            businessId: parseInt(businessId),
            availability: availability,
        });
    } catch (error) {
        console.error("Error fetching availability: ", error);
        res.status(500).json({
            error: "Failed to fetch availability",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET /api/availability/:businessId/dates - get available dates for next N days
router.get("/:businessId/dates", async (req, res) => {
    try {
        const { businessId } = req.params;
        const { days = 30 } = req.query;

        const availableDates = await Availability.getAvailableDates(
            businessId,
            parseInt(days)
        );

        res.json({
            success: true,
            businessId: parseInt(businessId),
            daysChecked: parseInt(days),
            count: availableDates.length,
            availableDates: availableDates,
        });
    } catch (error) {
        console.error("Error fetching available dates: ", error);
        res.status(500).json({
            error: "Failed to fetch available dates",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET /api/availability/:businessId/slots/:date - get available time slots for a specific date
router.get("/:businessId/slots/:date", async (req, res) => {
    try {
        const { businessId, date } = req.params;

        // validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                error: "Invalid date format. Use YYYY-MM-DD",
            });
        }

        // check if date is in the past
        const requestedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (requestedDate < today) {
            return res.status(400).json({
                error: "Cannot check availability for past dates",
            });
        }

        const availableSlots = await Availability.getAvailableTimeSlots(
            businessId,
            date
        );

        res.json({
            success: true,
            businessId: parseInt(businessId),
            date: date,
            dayOfWeek: requestedDate.getDay(),
            availableSlots: availableSlots,
        });
    } catch (error) {
        console.error("Error fetching available slots: ", error);
        res.status(500).json({
            error: "Failed to fetch available slots",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET /api/availability/:businessId/day/:dayOfWeek - get availability settings for specific day
router.get("/:businessId/day/:dayOfWeek", async (req, res) => {
    try {
        const { businessId, dayOfWeek } = req.params;

        // validate day of week (0 - 6)
        const day = parseInt(dayOfWeek);
        if (isNaN(day) || day < 0 || day > 6) {
            return res.status(400).json({
                error: "Invalid day of week. Use 0 - 6 (Sunday=0, Monday=1, etc.)",
            });
        }

        const dayAvailability = await Availability.getByBusinessAndDay(
            businessId,
            day
        );

        if (!dayAvailability) {
            return res.status(404).json({
                error: "No availability settings found for this day",
            });
        }

        res.json({
            success: true,
            businessId: parseInt(businessId),
            dayOfWeek: day,
            availability: dayAvailability,
        });
    } catch (error) {
        console.error("Error fetching day availability: ", error);
        res.status(500).json({
            error: "Failed to fetch day availability",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// PUT /api/availability/:businessId/day/:dayOfWeek - update availability for specific day
router.put("/:businessId/day/:dayOfWeek", async (req, res) => {
    try {
        const { businessId, dayOfWeek } = req.params;
        const { morning_available, afternoon_available, evening_available } =
            req.body;

        // validate day of week
        const day = parseInt(dayOfWeek);
        if (isNaN(day) || day < 0 || day > 6) {
            return res.status(400).json({
                error: "Invalid day of week. Use 0 - 6 (Sunday=0, Monday=1, etc.)",
            });
        }

        // validate bool values
        if (
            typeof morning_available !== "boolean" ||
            typeof afternoon_available !== "boolean" ||
            typeof evening_available !== "boolean"
        ) {
            return res.status(400).json({
                error: "All availability fields must be boolean values",
                required: {
                    morning_available: "boolean",
                    afternoon_available: "boolean",
                    evening_available: "boolean",
                },
            });
        }

        const updatedAvailability = await Availability.updateDay(
            businessId,
            day,
            { morning_available, afternoon_available, evening_available }
        );

        res.json({
            success: true,
            message: `Availability updated for day ${day}`,
            businessId: parseInt(businessId),
            dayOfWeek: day,
            availability: updatedAvailability,
        });
    } catch (error) {
        console.error("Error updating availability: ", error);
        res.status(500).json({
            error: "Failed to update availability",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// POST /api/availability/:businessId/reset - reset availability to default (all closed)
router.post("/:businessId/reset", async (req, res) => {
    try {
        const { businessId } = req.params;
        const defaultAvailability = await Availability.setDefaultAvailability(
            businessId
        );

        res.json({
            success: true,
            message: "Availability reset to default (all days closed)",
            businessId: parseInt(businessId),
            availability: defaultAvailability,
        });
    } catch (error) {
        console.error("Error resetting availability: ", error);
        res.status(500).json({
            error: "Failed to reset availability",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

// GET /api/availability/:businessId/next-available - get the next available appointment slot
router.get("/:businessId/next-available", async (req, res) => {
    try {
        const { businessId } = req.params;
        const { days = 30 } = req.query;

        const availableDates = await Availability.getAvailableDates(
            businessId,
            parseInt(days)
        );

        if (availableDates.length === 0) {
            return res.json({
                success: true,
                businessId: parseInt(businessId),
                nextAvailable: null,
                message: `No available slots found in the next ${days} days`,
            });
        }

        const nextAvailable = availableDates[0];

        res.json({
            success: true,
            businessId: parseInt(businessId),
            nextAvailable: {
                date: nextAvailable.date,
                dayOfWeek: nextAvailable.dayOfWeek,
                availableSlots: nextAvailable.availableSlots,
                slotsCount: nextAvailable.availableSlots.length,
            },
        });
    } catch (error) {
        console.error("Error finding next available slot: ", error);
        res.status(500).json({
            error: "Failed to find next available slot",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
});

module.exports = router;
