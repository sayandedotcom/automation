// Re-export common helpers from flights (shared utilities)
export { createStep, type AutomationStepData } from "../flights/common-helpers";

// Location input helpers
export { fillPickupLocation, fillDropoffLocation } from "./location-helpers";

// Search/results helpers
export { clickSearchButton, waitForRideResults } from "./search-helpers";
