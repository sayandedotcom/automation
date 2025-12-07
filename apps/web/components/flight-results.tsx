import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, ArrowRight } from "lucide-react";
import type { FlightResult } from "@/lib/schema/flights";
import { formatTime, formatDuration, formatPrice } from "@/lib/utils";

interface FlightResultsProps {
  flights: FlightResult[];
}

export function FlightResults({ flights }: FlightResultsProps) {
  if (flights.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
          <Plane className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No flights found
        </h3>
        <p className="text-muted-foreground">
          Try adjusting your search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {flights.length} {flights.length === 1 ? "Flight" : "Flights"} Found
        </h3>
      </div>

      <div className="space-y-4">
        {flights.map((flight) => (
          <Card
            key={flight.id}
            className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border-2 hover:border-primary"
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left section - Flight details */}
                <div className="flex-1 space-y-4">
                  {/* Airline */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                      {flight.airline.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {flight.airline}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {flight.flightNumber}
                      </p>
                    </div>
                  </div>

                  {/* Times and route */}
                  <div className="flex items-center justify-between">
                    {/* Departure */}
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {formatTime(flight.departure.time)}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">
                        {flight.departure.airport}
                      </p>
                    </div>

                    {/* Duration and stops */}
                    <div className="flex-1 px-6">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(flight.duration)}</span>
                        </div>
                        <div className="relative w-full">
                          <div className="h-0.5 bg-border w-full" />
                          <ArrowRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground bg-background" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {flight.stops === 0
                            ? "Direct"
                            : `${flight.stops} ${flight.stops === 1 ? "stop" : "stops"}`}
                        </p>
                      </div>
                    </div>

                    {/* Arrival */}
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {formatTime(flight.arrival.time)}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">
                        {flight.arrival.airport}
                      </p>
                    </div>
                  </div>

                  {/* Layovers if any */}
                  {flight.layovers && flight.layovers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {flight.layovers.map((layover, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          Layover: {layover.airport} (
                          {formatDuration(layover.duration)})
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {flight.stops === 0 && (
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                        Direct Flight
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Right section - Price */}
                <div className="md:w-48 flex flex-col items-end justify-center space-y-3 md:border-l md:pl-6 border-border">
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      {formatPrice(flight.price)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      per person
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
