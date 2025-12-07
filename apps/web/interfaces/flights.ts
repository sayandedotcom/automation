export interface AutomationStep {
  step: number;
  action: string;
  result: string;
  timestamp: string;
}

export interface FlightDetails {
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate?: string;
  arrivalDate?: string;
  duration: string;
  stops: string;
  airlines: string;
  price: string;
}

export interface AutomationResult {
  success: boolean;
  message: string;
  steps: AutomationStep[];
  flights?: FlightDetails[];
  totalResults?: number;
  requested?: {
    tripType: string;
    travelClass: string;
    from?: string;
    to?: string;
    directFlights: boolean;
  };
  analysis?: {
    initial: {
      tripTypeFound: boolean;
      currentTripType?: string;
      classDropdownFound: boolean;
      currentClass?: string;
      directFlightsFound: boolean;
      directFlightsChecked: boolean;
      description: string;
    };
    verification: {
      tripType?: string;
      travelClass?: string;
      directFlightsChecked: boolean;
      success: boolean;
      description: string;
    };
  };
}
