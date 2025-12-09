// Types barrel export
// Note: AutomationStep and AutomationResult have different shapes per feature
// Import directly from @/lib/types/flights or @/lib/types/uber as needed
export type {
  FlightDetails,
  AutomationResult as FlightAutomationResult,
  AutomationStep as FlightAutomationStep,
} from "./flights";
export type {
  RideOption,
  AutomationResult as UberAutomationResult,
  AutomationStep as UberAutomationStep,
} from "./uber";
