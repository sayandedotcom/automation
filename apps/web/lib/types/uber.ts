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
