import { z } from "zod";

// Schema for Uber ride search input
export const uberSearchSchema = z.object({
  pickup: z.string().min(3, "Pickup location must be at least 3 characters"),
  dropoff: z.string().min(3, "Dropoff location must be at least 3 characters"),
});

export type UberSearchInput = z.infer<typeof uberSearchSchema>;

// Schema for ride option extraction by AI
export const rideOptionSchema = z.object({
  name: z.string().describe("Ride type name (e.g., 'UberX', 'Uber Black')"),
  description: z
    .string()
    .optional()
    .describe("Short description of the ride type"),
  fare: z.string().describe("Fare/price (e.g., '₹250', '$15.50')"),
  eta: z
    .string()
    .optional()
    .describe("Estimated time of arrival (e.g., '5 min')"),
  capacity: z
    .string()
    .optional()
    .describe("Vehicle capacity (e.g., '4 seats')"),
});

export type RideOption = z.infer<typeof rideOptionSchema>;

// Schema for AI to extract ride options from page
export const rideResultsSchema = z.object({
  rides: z
    .array(rideOptionSchema)
    .describe("List of available ride options found on the page"),
  pickup: z.string().optional().describe("Detected pickup location"),
  dropoff: z.string().optional().describe("Detected dropoff location"),
});

// Schema for ride options extraction (API response)
export const rideOptionsSchema = z.object({
  rides: z.array(rideOptionSchema).describe("List of available ride options"),
  totalOptions: z
    .number()
    .optional()
    .describe("Total number of ride options shown"),
});

// Schema for page analysis
export const uberPageAnalysisSchema = z.object({
  isLoggedIn: z.boolean().describe("Whether the user is logged in to Uber"),
  pickupFieldFound: z
    .boolean()
    .describe("Whether the pickup location field was found"),
  dropoffFieldFound: z
    .boolean()
    .describe("Whether the dropoff location field was found"),
  ridesVisible: z
    .boolean()
    .describe("Whether ride options are currently visible"),
  description: z.string().describe("Description of what was found on the page"),
});

// Schema for auth state
export const uberAuthStateSchema = z.object({
  cookies: z.array(z.any()).optional(),
  origins: z.array(z.any()).optional(),
});

export type UberAuthState = z.infer<typeof uberAuthStateSchema>;
