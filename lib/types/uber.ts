export interface AutomationStep {
  step: number;
  action: string;
  result: string;
  timestamp: string;
}

export interface RideOption {
  name: string;
  description?: string;
  fare: string;
  eta?: string;
  capacity?: string;
}

export interface AutomationResult {
  success: boolean;
  message: string;
  steps: AutomationStep[];
  rides?: RideOption[];
  authRequired?: boolean;
  requested?: {
    pickup: string;
    dropoff: string;
  };
}

// Playwright storage state type for Uber authentication
export interface UberStorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

// API request body type
export interface UberSearchRequest {
  pickup: string;
  dropoff: string;
  authState?: UberStorageState;
}
