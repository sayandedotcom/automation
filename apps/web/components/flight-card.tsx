"use client";

import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlightDetails } from "@/lib/types/flights";

interface FlightCardProps {
  flight: FlightDetails;
  index: number;
}

export function FlightCard({ flight, index }: FlightCardProps) {
  return (
    <div
      key={index}
      className="p-4 rounded-xl border-2 border-border bg-card hover:border-primary/50 transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Flight Times & Route */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            {/* Departure */}
            <div className="text-center">
              <div className="text-xl font-bold">{flight.departureTime}</div>
              <div className="text-sm text-muted-foreground">
                {flight.departureAirport}
              </div>
              {flight.departureDate && (
                <div className="text-xs text-muted-foreground">
                  {flight.departureDate}
                </div>
              )}
            </div>

            {/* Duration & Stops */}
            <div className="flex-1 px-2">
              <div className="relative">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{flight.duration}</span>
                </div>
                <div className="relative h-0.5 bg-muted-foreground/30 rounded">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                </div>
                <div className="flex justify-center mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      flight.stops.toLowerCase() === "direct"
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary/20 text-secondary-foreground"
                    }`}
                  >
                    {flight.stops}
                  </span>
                </div>
              </div>
            </div>

            {/* Arrival */}
            <div className="text-center">
              <div className="text-xl font-bold">{flight.arrivalTime}</div>
              <div className="text-sm text-muted-foreground">
                {flight.arrivalAirport}
              </div>
              {flight.arrivalDate && (
                <div className="text-xs text-muted-foreground">
                  {flight.arrivalDate}
                </div>
              )}
            </div>
          </div>

          {/* Airlines */}
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {flight.airlines}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right md:min-w-[140px]">
          <div className="text-2xl font-bold text-primary">{flight.price}</div>
          <Button size="sm" variant="outline" className="mt-2">
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}
