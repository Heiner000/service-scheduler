const express = require("express");
const router = express.Router();
const Business = require("../models/Business");

// GET /api/businesses/:id - get business by id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const business = await Business.getById(id);

        if (!business) {
            return res.status(404).json({
                error: "Business not found",
            });
        }

        res.json({
            success: true,
            business: business,
        });
    } catch (error) {
        console.error("Error fetching business: ", error);
        res.status(500).json({
            error: "Failed to fetch business",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

// GET /api/businesses/:id/services - get service types for a business
router.get("/:id/services", async (req, res) => {
    try {
        const { id } = req.params;

        // check if business exists
        const business = await Business.getById(id);
        if (!business) {
            return res.status(404).json({
                error: "Business not found",
            });
        }

        const serviceTypes = await Business.getServiceTypes(id);

        res.json({
            success: true,
            businessId: parseInt(id),
            businessName: business.business_name,
            serviceTypes: serviceTypes,
        });
    } catch (error) {
        console.error("Error fetching service types: ", error);
        res.status(500).json({
            error: "Failed to fetch service types",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

// PUT /api/businesses/:id/services - update service types for a business
router.put("/:id/services", async (req, res) => {
    try {
        const { id } = req.params;
        const { service_types } = req.body;

        // validate service_types is an array
        if (!Array.isArray(service_types)) {
            return res.status(400).json({
                error: "service_types must be an array",
                example: ["service 1", "service 2", "service 3"],
            });
        }

        // validate array is not empty
        if (service_types.length === 0) {
            return res.status(400).json({
                error: "At least one service type is required",
            });
        }

        // validate all elements are strings
        const allStrings = service_types.every(
            (service) =>
                typeof service === "string" && service.trim().length > 0
        );
        if (!allStrings) {
            return res.status(400).json({
                error: "All service types must be non-empty strings",
            });
        }

        // check if business exists
        const business = await Business.getById(id);
        if (!business) {
            return res.status(404).json({
                error: "Business not found",
            });
        }

        // remove dupes and trim whitespace
        const cleanedServices = [
            ...new Set(service_types.map((service) => service.trim())),
        ];
        const updatedServices = await Business.updateServiceTypes(
            id,
            cleanedServices
        );

        res.json({
            success: true,
            message: "Service types updated successfully",
            businessId: parseInt(id),
            serviceTypes: updatedServices,
        });
    } catch (error) {
        console.error("Error updating service types: ", error);
        res.status(500).json({
            error: "Failed to update service types",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

// GET /api/businesses - get all businesses (for admin/multi-tenant)
router.get("/", async (req, res) => {
    try {
        const businesses = await Business.getAll();

        res.json({
            success: true,
            count: businesses.length,
            businesses: businesses,
        });
    } catch (error) {
        console.error("Error fetching businesses: ", error);
        res.status(500).json({
            error: "Failed to fetch businesses",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

// POST /api/businesses - create a new business
router.post("/", async (req, res) => {
    try {
        const { business_name, owner_name, email, phone, service_types } =
            req.body;

        // validate required fields
        if (!business_name || !owner_name || !email) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["business_name", "owner_name", "email"],
            });
        }

        // validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: "Invalid email format",
            });
        }

        // check if business w/ this email already exists
        const existingBusiness = await Business.getByEmail(email);
        if (existingBusiness) {
            return res.status(409).json({
                error: "Business with this email already exists",
            });
        }

        // validate service_types if provided
        if (service_types && !Array.isArray(service_types)) {
            return res.status(400).json({
                error: "service_types must be an array",
            });
        }

        const newBusiness = await Business.create(req.body);

        res.status(201).json({
            success: true,
            message: "Business created successfully",
            business: newBusiness,
        });
    } catch (error) {
        console.error("Error creating business: ", error);
        res.status(500).json({
            error: "Failed to create business",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

// PUT /api/businesses/:id - update business information
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { business_name, owner_name, email, phone, service_types } =
            req.body;

        // check if business exists
        const existingBusiness = await Business.getById(id);
        if (!existingBusiness) {
            return res.status(404).json({
                error: "Business not found",
            });
        }

        // validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: "Invalid email format",
                });
            }

            // check if another business has this email
            const businessWithEmail = await Business.getByEmail(email);
            if (businessWithEmail && businessWithEmail.id !== parseInt(id)) {
                return res.status(409).json({
                    error: "Another business already uses this email",
                });
            }
        }

        // validate service_types if provided
        if (service_types && !Array.isArray(service_types)) {
            return res.status(400).json({
                error: "service_types must be an array",
            });
        }

        const updatedBusiness = await Business.update(id, req.body);

        res.json({
            success: true,
            message: "Business updated successfully",
            business: updatedBusiness,
        });
    } catch (error) {
        console.error("Error updating business: ", error);
        res.status(500).json({
            error: "Failed to update business",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

// DELETE /api/businesses/:id - delete a business
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // check if business exists
        const existingBusiness = await Business.getById(id);
        if (!existingBusiness) {
            return res.status(404).json({
                error: "Business not found",
            });
        }

        const deletedBusiness = await Business.delete(id);

        res.json({
            success: true,
            message: "Business deleted successfully",
            business: deletedBusiness,
        });
    } catch (error) {
        console.error("Error deleting business: ", error);
        res.status(500).json({
            error: "Failed to delete business",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

// GET /api/businesses/:id/contact - get business contact info (public endpoint)
router.get("/:id/contact", async (req, res) => {
    try {
        const { id } = req.params;
        const business = await Business.getById(id);

        if (!business) {
            return res.status(404).json({
                error: "Business not found",
            });
        }

        // Return only public contact info (not full business details)
        res.json({
            success: true,
            contact: {
                businessName: business.business_name,
                phone: business.phone,
                email: business.email,
            },
        });
    } catch (error) {
        console.error("Error fetching business contact: ", error);
        res.status(500).json({
            error: "Failed to fetch business contact",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal service error",
        });
    }
});

module.exports = router;
