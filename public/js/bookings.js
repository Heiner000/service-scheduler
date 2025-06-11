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

// FORM VALIDATION
// =======================================

// FORM SUBMISSION
// =======================================

// INITIALIZATION
// =======================================

// START THE APP
// =======================================