// service booking form core functionality
// =======================================

// config & constants
const CONFIG = {
    API_BASE: "/",
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
    selectedTimeslot: null,
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
function hideLoading(element = null, OriginalText = "") {
    if (element) {
        element.disabled = false;
        element.textContent = OriginalText;
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
            "{businessId",
            CONFIG.BUSINESS_ID
        );
        const response = await apiRequest(endpoint);

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
        Elements.dataSelect.innerHTML =
            '<option value="">Choose a date</option>';

        if (AppState.availableDates.length === 0) {
            Elements.dateSelect.innerHTML =
                'option value="">No dates available</option>';
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
                slotDiv.classList.remove(
                    "peer-disabled:bg-gray-50",
                    "peer-disabled:cursor-not-allowed"
                );
                slotTitle.classList.remove("text-gray-400");
                slotTitle.classList.add("text-gray-900");
                slotTime.classList.remove("text-gray-400");
                slotTime.classList.add("text-gray-600");
            } else {
                // keep disabled
                input.disabled = true;
                label.classList.add("cursor-not-allowed");
                label.classList.remove("cursor-pointer");
                slotDiv.classList.add(
                    "peer-disabled:bg-gray-50",
                    "peer-disabled:cursor-not-allowed"
                );
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
        console.error("Failed to load time slots");
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
        slotDiv.classList.add(
            "peer-disabled:bg-gray-50",
            "peer-disabled:cursor-not-allowed"
        );
        slotTitle.classList.add("text-gray-400");
        slotTitle.classList.remove("text-gray-900");
        slotTime.classList.add("text-gray-400");
        slotTime.classList.remove("text-gray-600");
    });

    AppState.selectedTimeslot = null;
    validateForm();
}

// FORM VALIDATION
// =======================================

// FORM SUBMISSION
// =======================================

// INITIALIZATION
// =======================================

// START THE APP
// =======================================
