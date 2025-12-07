import { z } from "zod";

export const flightSearchSchema = z.object({
  from: z.string().min(2, "Origin city is required"),
  to: z.string().min(2, "Destination city is required"),
  departDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().optional(),
  adults: z.number().min(1).max(9).default(1),
  tripType: z.enum(["round-trip", "one-way"]).default("round-trip"),
  travelClass: z
    .enum(["economy", "premium_economy", "business", "first"])
    .default("economy"),
  directFlights: z.boolean().default(false),
});

export type FlightSearchInput = z.infer<typeof flightSearchSchema>;

export const flightResultSchema = z.object({
  id: z.string(),
  airline: z.string(),
  flightNumber: z.string(),
  departure: z.object({
    airport: z.string(),
    time: z.string(),
    date: z.string(),
  }),
  arrival: z.object({
    airport: z.string(),
    time: z.string(),
    date: z.string(),
  }),
  duration: z.number(), // in minutes
  stops: z.number(),
  price: z.number(),
  layovers: z
    .array(
      z.object({
        airport: z.string(),
        duration: z.number(), // in minutes
      })
    )
    .optional(),
});

export type FlightResult = z.infer<typeof flightResultSchema>;

// Schema for AI to analyze and find UI elements
export const pageAnalysisSchema = z.object({
  tripTypeFound: z
    .boolean()
    .describe("Whether trip type options (Round-trip, One-way) were found"),
  currentTripType: z
    .string()
    .optional()
    .describe("Currently selected trip type"),
  classDropdownFound: z
    .boolean()
    .describe("Whether the travel class dropdown was found"),
  currentClass: z.string().optional().describe("Currently selected class"),
  directFlightsFound: z
    .boolean()
    .describe("Whether the 'Direct flights only' checkbox was found"),
  directFlightsChecked: z
    .boolean()
    .describe("Whether direct flights checkbox is checked"),
  description: z.string().describe("Description of what was found on the page"),
});

// Schema for verification after actions
export const verificationSchema = z.object({
  tripType: z
    .string()
    .optional()
    .describe("Currently selected trip type after actions"),
  travelClass: z
    .string()
    .optional()
    .describe("Currently selected class after actions"),
  directFlightsChecked: z
    .boolean()
    .describe("Whether direct flights checkbox is now checked"),
  success: z.boolean().describe("Whether the actions were successful"),
  description: z.string().describe("Description of the result"),
});

// Schema for flight details extraction
export const flightDetailsSchema = z.object({
  flights: z
    .array(
      z.object({
        departureTime: z.string().describe("Departure time (e.g., '6:30 PM')"),
        arrivalTime: z.string().describe("Arrival time (e.g., '2:20 AM')"),
        departureAirport: z
          .string()
          .describe("Departure airport code (e.g., 'CCU')"),
        arrivalAirport: z
          .string()
          .describe("Arrival airport code (e.g., 'DXB')"),
        departureDate: z.string().optional().describe("Departure date"),
        arrivalDate: z.string().optional().describe("Arrival date"),
        duration: z.string().describe("Flight duration (e.g., '9h 20m')"),
        stops: z
          .string()
          .describe("Number of stops (e.g., 'Direct', '1 stop', '2 stops')"),
        airlines: z.string().describe("Airline name(s)"),
        price: z.string().describe("Price (e.g., 'INR35,389.83')"),
      })
    )
    .describe("List of flights found on the results page"),
  totalResults: z
    .number()
    .optional()
    .describe("Total number of results if shown"),
});
