// service booking form core functionality
// =======================================

// config & constants
const CONFIG = {
    API_BASE: "/api",
    BUSINESS_ID: 1,
    ENDPOINTS: {
        SERVICES: "/businesses/{businessId}/services",
        AVAILABLE_DATES: "/availability/{businessId}/dates",
        TIME_SLOTS: "/availability/{businessId}/slots/{date}",
        CREATE_BOOKING: "/bookings",
    },
};

// State management
const AppState = {
    currentStep: 1,
    selectedService: null,
    selectedDate: null,
    selectedTimeSlot: null,
    availableDates: [],
    serviceTypes: [],
    isLoading: false,
};

// DOM elements cache
const Elements = {
    form: null,
    serviceSelect: null,
    dateSelect: null,
    timeSlots: null,
    submitBtn: null,
    submitText: null,
    submitSpinner: null,
    loadingOverlay: null,
    messageContainer: null,
    errorMessage: null,
    successMessage: null,
    progressBar: null,
};

// UTILITY functions
// =======================================

/**
 * Make API requests with error handling
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const url = CONFIG.API_BASE + endpoint;
        console.log("Making API request to:", url);
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorDate = await response.json().catch(() => ({}));
            throw new Error(
                errorDate.error ||
                    `HTTP ${response.status}: ${response.statusText}`
            );
        }
        return await response.json();
    } catch (error) {
        console.error("API Request failed: ", error);
        throw error;
    }
}

/**
 * Show loading state
 */
function showLoading(element = null, text = "Loading. . .") {
    if (element) {
        element.disabled = true;
        element.textContent = text;
    }
    AppState.isLoading = true;
}

/**
 * Hide loading state
 */
function hideLoading(element = null, originalText = "") {
    if (element) {
        element.disabled = false;
        if (element.tagName !== "SELECT") {
            element.textContent = originalText;
        }
    }
    AppState.isLoading = false;
}

/**
 * Show success message
 */
function showSuccess(message) {
    hideMessage();
    Elements.messageContainer.classList.remove("hidden");
    Elements.successMessage.classList.remove("hidden");
    Elements.successMessage.querySelector("#success-text").textContent =
        message;

    // scroll to message
    Elements.messageContainer.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });
}

/**
 * Show error message
 */
function showError(message) {
    hideMessage();
    Elements.messageContainer.classList.remove("hidden");
    Elements.errorMessage.classList.remove("hidden");
    Elements.errorMessage.querySelector("#error-text").textContent = message;

    // scroll to message
    Elements.messageContainer.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });
}

/**
 * Hide all messages
 */
function hideMessage() {
    Elements.messageContainer.classList.add("hidden");
    Elements.errorMessage.classList.add("hidden");
    Elements.successMessage.classList.add("hidden");
}

/**
 * format date for display
 */
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    return date.toLocaleDateString("en-us", options);
}

/**
 * update progress bar
 */
function updateProgress(step) {
    const percentage = (step / 3) * 100;
    Elements.progressBar.style.width = `${percentage}%`;

    // update step indicators
    const stepIndicators = document.querySelectorAll(".w-6.h-6");
    stepIndicators.forEach((indicator, index) => {
        const stepNum = index + 1;
        if (stepNum <= step) {
            indicator.className = indicator.className.replace(
                "bg-gray-300 text-gray-600",
                "bg-primary text-white"
            );
        } else {
            indicator.className = indicator.className.replace(
                "bg-primary text-white",
                "bg-gray-300 text-gray-600"
            );
        }
    });
}

// API INTEGRATION functions
// =======================================

/**
 * load service types from api
 */
async function loadServiceTypes() {
    try {
        showLoading(Elements.serviceSelect, "Loading services . . .");

        const endpoint = CONFIG.ENDPOINTS.SERVICES.replace(
            "{businessId}",
            CONFIG.BUSINESS_ID
        );
        const response = await apiRequest(endpoint);

        console.log("API Response: ", response);
        console.log("Service Types: ", response.serviceTypes);
        console.log("Service Select Element: ", Elements.serviceSelect);
        console.log(
            "Service Select HTML before: ",
            Elements.serviceSelect.innerHTML
        );

        AppState.serviceTypes = response.serviceTypes || [];

        // populate dropdown
        Elements.serviceSelect.innerHTML =
            '<option value="">Choose a service</option>';
        AppState.serviceTypes.forEach((service) => {
            const option = document.createElement("option");
            option.value = service;
            option.textContent = service;
            Elements.serviceSelect.appendChild(option);
        });

        console.log(
            "Service Select HTML after: ",
            Elements.serviceSelect.innerHTML
        );

        hideLoading(Elements.serviceSelect);
    } catch (error) {
        console.error("Failed to load service types: ", error);
        showError(
            "Failed to load service types. Please refresh the page and try again."
        );
        Elements.serviceSelect.innerHTML =
            '<option value="">Error loading services</option>';
        hideLoading(Elements.serviceSelect);
    }
}

/**
 * Load available dates from API
 */
async function loadAvailableDates() {
    try {
        showLoading(Elements.dateSelect, "Loading available dates . . .");

        const endpoint = CONFIG.ENDPOINTS.AVAILABLE_DATES.replace(
            "{businessId}",
            CONFIG.BUSINESS_ID
        );
        const response = await apiRequest(`${endpoint}?days=30`);

        AppState.availableDates = response.availableDates || [];

        // Populate date dropdown
        Elements.dateSelect.innerHTML =
            '<option value="">Choose a date</option>';

        if (AppState.availableDates.length === 0) {
            Elements.dateSelect.innerHTML =
                '<option value="">No dates available</option>';
            showError(
                "No available dates found for the next 30 days. Please contact us directly."
            );
            return;
        }

        AppState.availableDates.forEach((dateInfo) => {
            const option = document.createElement("option");
            option.value = dateInfo.date;
            option.textContent = formatDateForDisplay(dateInfo.date);
            option.dataset.availableSlots = JSON.stringify(
                dateInfo.availableSlots
            );
            Elements.dateSelect.appendChild(option);
        });

        // Enable date selection
        Elements.dateSelect.disabled = false;
        hideLoading(Elements.dateSelect);
    } catch (error) {
        console.error("Failed to load available dates: ", error);
        showError("Failed to load available dates. Please try again.");
        Elements.dateSelect.innerHTML =
            '<option value="">Error loading dates</option>';
        hideLoading(Elements.dateSelect);
    }
}

/**
 * Load available time slots for selected date
 */
async function loadTimeSlots(selectedDate) {
    try {
        // Reset time slots
        resetTimeSlots();

        const endpoint = CONFIG.ENDPOINTS.TIME_SLOTS.replace(
            "{businessId}",
            CONFIG.BUSINESS_ID
        ).replace("{date}", selectedDate);

        const response = await apiRequest(endpoint);
        const availableSlots = response.availableSlots || [];

        // Enable available time slots
        const timeSlotInputs = Elements.timeSlots.querySelectorAll(
            'input[name="time_slot"]'
        );
        const timeSlotLabels = Elements.timeSlots.querySelectorAll("label");

        timeSlotInputs.forEach((input, index) => {
            const label = timeSlotLabels[index];
            const slotDiv = label.querySelector("div");
            const slotTitle = slotDiv.querySelector(".font-medium");
            const slotTime = slotDiv.querySelector(".text-sm");

            if (availableSlots.includes(input.value)) {
                // enable this slot
                input.disabled = false;
                label.classList.remove("cursor-not-allowed");
                label.classList.add("cursor-pointer");

                // update text colors for enabled state
                slotTitle.classList.remove("text-gray-400");
                slotTitle.classList.add("text-gray-900");
                slotTime.classList.remove("text-gray-400");
                slotTime.classList.add("text-gray-600");
            } else {
                // keep disabled
                input.disabled = true;
                label.classList.add("cursor-not-allowed");
                label.classList.remove("cursor-pointer");

                // keep text colors for disabled state
                slotTitle.classList.add("text-gray-400");
                slotTitle.classList.remove("text-gray-900");
                slotTime.classList.add("text-gray-400");
                slotTime.classList.remove("text-gray-600");
            }
        });

        // update helper text
        const helperText =
            Elements.timeSlots.parentElement.querySelector(".text-gray-500");
        if (availableSlots.length === 0) {
            helperText.textContent = "No time slots available for this date";
            showError(
                "No time slots available for the selected date. Please choose a different date."
            );
        } else {
            helperText.textContent = `${availableSlots.length} time slot${
                availableSlots.length !== 1 ? "s" : ""
            } available`;
        }
    } catch (error) {
        console.error("Failed to load time slots", error);
        showError(
            "Failed to laod available time slots. Please try selected a different date."
        );
        resetTimeSlots();
    }
}

/**
 * Reset time slots to disabled state
 */
function resetTimeSlots() {
    const timeSlotInputs = Elements.timeSlots.querySelectorAll(
        'input[name="time_slot"]'
    );
    const timeSlotLabels = Elements.timeSlots.querySelectorAll("label");

    timeSlotInputs.forEach((input, index) => {
        const label = timeSlotLabels[index];
        const slotDiv = label.querySelector("div");
        const slotTitle = slotDiv.querySelector(".font-medium");
        const slotTime = slotDiv.querySelector(".text-sm");

        input.disabled = true;
        input.checked = false;
        label.classList.add("cursor-not-allowed");
        label.classList.remove("cursor-pointer");

        // reset to disabled text colors
        slotTitle.classList.add("text-gray-400");
        slotTitle.classList.remove("text-gray-900");
        slotTime.classList.add("text-gray-400");
        slotTime.classList.remove("text-gray-600");
    });

    AppState.selectedTimeSlot = null;
    validateForm();
}

// FORM VALIDATION
// =======================================

/**
 * validate form & enable/disable submit button
 */
function validateForm() {
    const formData = new FormData(Elements.form);

    // require fields
    const requiredFields = [
        "service_type",
        "booking_date",
        "time_slot",
        "customer_name",
        "customer_email",
    ];

    const isValid = requiredFields.every((field) => {
        const value = formData.get(field);
        return value && value.trim() !== "";
    });

    // email validation
    const email = formData.get("customer_email");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = !email || emailRegex.test(email);

    const canSubmit = isValid && isEmailValid && !AppState.isLoading;

    Elements.submitBtn.disabled = !canSubmit;

    // update progress
    let step = 1;
    if (formData.get("service_type")) step = 2;
    if (formData.get("booking_date") && formData.get("time_slot")) step = 3;

    if (step !== AppState.currentStep) {
        AppState.currentStep = step;
        updateProgress(step);
    }

    return canSubmit;
}

/**
 * Handle service selection
 */
function handleServiceSelection(event) {
    const selectedService = event.target.value;
    AppState.selectedService = selectedService;

    if (selectedService) {
        // load available dates for this service
        loadAvailableDates();
        hideMessage(); // clears previous error messages
    } else {
        // reset form if no service selected
        Elements.dateSelect.disabled = true;
        Elements.dateSelect.innerHTML =
            '<option value="">Select a service first</option>';
        resetTimeSlots();
        AppState.selectedDate = null;
    }

    validateForm();
}

/**
 * Handle date selection
 */
function handleDateSelection(event) {
    const selectedDate = event.target.value;
    AppState.selectedDate = selectedDate;

    if (selectedDate) {
        loadTimeSlots(selectedDate);
        hideMessage(); // clear any previous error messages
    } else {
        resetTimeSlots();
    }

    validateForm();
}

/**
 * Handle time slot selection
 */
function handleTimeSlotSelection(event) {
    AppState.selectedTimeSlot = event.target.value;
    console.log("Time slot selected: ", AppState.selectedTimeSlot);

    validateForm();
}

// FORM SUBMISSION
// =======================================

/**
 * Submit booking form
 */
async function handleFormSubmission(event) {
    event.preventDefault();

    if (!validateForm()) {
        showError("Please fill in all required fields correctly");
        return;
    }

    try {
        // show loading state
        Elements.loadingOverlay.classList.remove("hidden");
        Elements.submitSpinner.classList.remove("hidden");
        Elements.submitText.textContent = "Creating booking. . .";
        showLoading(Elements.submitBtn);

        // prepare form data
        const formData = new FormData(Elements.form);
        const bookingData = {
            business_id: CONFIG.BUSINESS_ID,
            customer_name: formData.get("customer_name").trim(),
            customer_email: formData.get("customer_email").trim(),
            customer_phone: formData.get("customer_phone")?.trim() || null,
            customer_address: formData.get("customer_address")?.trim() || null,
            service_type: formData.get("service_type"),
            booking_date: formData.get("booking_date"),
            time_slot: formData.get("time_slot"),
            service_description:
                formData.get("service_description")?.trim() || null,
        };

        // submit to API
        const response = await apiRequest(CONFIG.ENDPOINTS.CREATE_BOOKING, {
            method: "POST",
            body: JSON.stringify(bookingData),
        });

        // success msg
        showSuccess(
            `Booking created successfully! Your appointment is scheduled for ${formatDateForDisplay(
                bookingData.booking_date
            )} during the ${
                bookingData.time_slot
            }. You'll receive a confirmation email shortly.`
        );

        // reset form
        Elements.form.reset();
        AppState.selectedService = null;
        AppState.selectedDate = null;
        AppState.selectedTimeSlot = null;
        Elements.dateSelect.disabled = true;
        resetTimeSlots();
        updateProgress(1);

        // scroll to success message
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        console.error("Booking submission failed: ", error);
        showError(
            error.message || "Failed to create booking. Please try again."
        );
    } finally {
        // hide loading state
        Elements.loadingOverlay.classList.add("hidden");
        Elements.submitSpinner.classList.add("hidden");
        Elements.submitText.textContent = "Complete Form";
        hideLoading(Elements.submitBtn);
    }
}

// INITIALIZATION
// =======================================
/**
 * Cache DOM elements
 */
function cacheElements() {
    Elements.form = document.getElementById("booking-form");
    Elements.serviceSelect = document.getElementById("service-type");
    Elements.dateSelect = document.getElementById("booking-date");
    Elements.timeSlots = document.getElementById("time-slots");
    Elements.submitBtn = document.getElementById("submit-btn");
    Elements.submitText = document.getElementById("submit-text");
    Elements.submitSpinner = document.getElementById("submit-spinner");
    Elements.loadingOverlay = document.getElementById("loading-overlay");
    Elements.messageContainer = document.getElementById("message-container");
    Elements.errorMessage = document.getElementById("error-message");
    Elements.successMessage = document.getElementById("success-message");
    Elements.progressBar = document.querySelector(".bg-primary.h-2");
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    // service selection
    Elements.serviceSelect.addEventListener("change", handleServiceSelection);

    // date selection
    Elements.dateSelect.addEventListener("change", handleDateSelection);

    // time slot selection
    Elements.timeSlots.addEventListener("change", handleTimeSlotSelection);

    // form submission
    Elements.form.addEventListener("submit", handleFormSubmission);

    // Form validation on input
    Elements.form.addEventListener("input", validateForm);

    // close messages when clicking outside
    document.addEventListener("click", (e) => {
        if (!Elements.messageContainer.contains(event.target)) {
            // don't auto-hide success messages
            if (!Elements.successMessage.classList.contains("hidden")) return;
            hideMessage();
        }
    });
}

/**
 * Initialize the booking form
 */
async function initializeBookingForm() {
    try {
        console.log("Initializing booking form. . .");

        // cache DOM elements
        cacheElements();

        // check if all required elements exist
        const requiredElements = Object.entries(Elements);
        const missingElements = requiredElements.filter(
            ([key, element]) => !element
        );

        if (missingElements.length > 0) {
            console.error(
                "Missing requried DOM elements: ",
                missingElements.map(([key]) => key)
            );
            return;
        }

        // attach event listeners
        attachEventListeners();

        // load initial data
        await loadServiceTypes();

        // iniial form validation
        validateForm();

        console.log("Booking form initialized successfully!");
    } catch (error) {
        console.error("Failed to initialize booking form: ", error);
        showError(
            "Failed to initialize booking form. Please refresh the page."
        );
    }
}

// START THE APP
// =======================================

/**
 * initialize when DOM is ready
 */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBookingForm);
} else {
    initializeBookingForm();
}
