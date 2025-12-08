"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Plane,
  Calendar as CalendarIcon,
  Users,
  ArrowRightLeft,
  ArrowLeft,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Camera,
  MousePointer2,
} from "lucide-react";
import {
  flightSearchSchema,
  type FlightSearchInput,
} from "@/lib/schema/flights";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AIRPORTS } from "@/config/airports";
import {
  AutomationResult,
  AutomationStep,
  FlightDetails,
} from "@/interfaces/flights";

export default function AutoPage() {
  const [date, setDate] = useState<DateRange | undefined>();
  const [singleDate, setSingleDate] = useState<Date | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AutomationResult | null>(null);

  const form = useForm<FlightSearchInput>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: {
      tripType: "round-trip",
      adults: 1,
      travelClass: "economy",
      directFlights: false,
      from: "",
      to: "",
      departDate: "",
      returnDate: undefined,
    },
  });

  // Watch values consolidated to reduce subscriptions
  const tripType = form.watch("tripType");
  const fromAirport = form.watch("from");
  const toAirport = form.watch("to");
  const adults = form.watch("adults");
  const travelClass = form.watch("travelClass");
  const directFlights = form.watch("directFlights");
  const departDate = form.watch("departDate");
  const returnDate = form.watch("returnDate");

  // Memoized travel class display mapping
  const travelClassDisplay = useMemo(
    () =>
      ({
        economy: "Economy",
        premium_economy: "Premium Economy",
        business: "Business",
        first: "First Class",
      }) as const,
    []
  );

  const travelClassBookingDisplay = useMemo(
    () =>
      ({
        economy: "Economy",
        premium_economy: "Premium economy",
        business: "Business",
        first: "First-class",
      }) as const,
    []
  );

  // Memoized airport options to prevent re-creation on each render
  const fromAirportOptions = useMemo(
    () =>
      AIRPORTS.map((airport) => ({
        ...airport,
        disabled: airport.code === toAirport,
      })),
    [toAirport]
  );

  const toAirportOptions = useMemo(
    () =>
      AIRPORTS.map((airport) => ({
        ...airport,
        disabled: airport.code === fromAirport,
      })),
    [fromAirport]
  );

  const runAutomation = useCallback(async () => {
    // Validate required fields first
    const isValid = await form.trigger(["from", "to", "departDate"]);

    if (!isValid) {
      toast.error(
        "Please fill in all required fields: Origin, Destination, and Travel dates"
      );
      return;
    }

    const formData = form.getValues();

    setIsRunning(true);
    setResult(null);

    toast.info(
      "🚀 Starting automation - Mirroring your selections on booking.com..."
    );
    console.log("🚀 Starting automation with:", formData);

    try {
      console.log("🚀 Starting automation with:", formData);

      const response = await fetch("/api/flights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripType: formData.tripType,
          travelClass: formData.travelClass,
          directFlights: formData.directFlights,
          from: formData.from,
          to: formData.to,
          departDate: formData.departDate,
          returnDate: formData.returnDate,
          adults: formData.adults,
        }),
      });

      const data: AutomationResult = await response.json();

      setResult(data);

      if (data.success) {
        toast.success("✅ Automation completed successfully!");
      } else {
        toast.error("❌ Automation completed with issues: " + data.message);
      }
    } catch (error) {
      console.error("Automation error:", error);
      toast.error("Failed to run automation");
    } finally {
      setIsRunning(false);
    }
  }, [form]);

  const handleSwap = useCallback(() => {
    const from = form.getValues("from");
    const to = form.getValues("to");
    form.setValue("from", to);
    form.setValue("to", from);
  }, [form]);

  const handleTripTypeChange = useCallback(
    (value: "round-trip" | "one-way") => {
      form.setValue("tripType", value);
      if (value === "one-way") {
        form.setValue("returnDate", undefined);
        if (date?.from) {
          setSingleDate(date.from);
        }
      } else {
        // Switching to round-trip: use single date as both departure and return
        if (singleDate) {
          setDate({ from: singleDate, to: singleDate });
          form.setValue("returnDate", format(singleDate, "yyyy-MM-dd"));
        }
      }
    },
    [form, date, singleDate]
  );

  const handleDateRangeSelect = useCallback(
    (val: DateRange | undefined) => {
      setDate(val);
      if (val?.from) {
        form.setValue("departDate", format(val.from, "yyyy-MM-dd"), {
          shouldValidate: true,
        });
      } else {
        form.setValue("departDate", "", {
          shouldValidate: true,
        });
      }
      if (val?.to) {
        form.setValue("returnDate", format(val.to, "yyyy-MM-dd"));
      } else {
        form.setValue("returnDate", undefined);
      }
    },
    [form]
  );

  const handleSingleDateSelect = useCallback(
    (val: Date | undefined) => {
      setSingleDate(val);
      if (val) {
        form.setValue("departDate", format(val, "yyyy-MM-dd"), {
          shouldValidate: true,
        });
        form.setValue("returnDate", undefined); // Clear return date for one-way
      } else {
        form.setValue("departDate", "", {
          shouldValidate: true,
        });
      }
    },
    [form]
  );

  const handleAdultsDecrement = useCallback(() => {
    form.setValue("adults", Math.max(1, (form.getValues("adults") || 1) - 1));
  }, [form]);

  const handleAdultsIncrement = useCallback(() => {
    form.setValue("adults", Math.min(9, (form.getValues("adults") || 1) + 1));
  }, [form]);

  const getStepIcon = useCallback((step: AutomationStep) => {
    if (step.result.includes("✅")) {
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    } else if (step.result.includes("❌")) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    } else if (step.result.includes("⚠️")) {
      return <CheckCircle2 className="h-5 w-5 text-secondary-foreground" />;
    } else if (step.result.includes("ℹ️")) {
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    }

    if (step.action.toLowerCase().includes("screenshot")) {
      return <Camera className="h-5 w-5 text-primary" />;
    } else if (
      step.action.toLowerCase().includes("gemini") ||
      step.action.toLowerCase().includes("ai")
    ) {
      return <Bot className="h-5 w-5 text-primary" />;
    } else if (
      step.action.toLowerCase().includes("click") ||
      step.action.toLowerCase().includes("select")
    ) {
      return <MousePointer2 className="h-5 w-5 text-secondary-foreground" />;
    }

    return <CheckCircle2 className="h-5 w-5 text-primary" />;
  }, []);

  // Memoized disabled date check function
  const isDateDisabled = useCallback(
    (dateToCheck: Date) =>
      dateToCheck < new Date(new Date().setHours(0, 0, 0, 0)),
    []
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        {/* Header */}
        <header className="pt-8 pb-6 px-4">
          <div className="max-w-7xl mx-auto">
            <Link href="/">
              <Button variant="ghost" className="mb-4 -ml-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-xl shadow-lg">
                <Plane className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-primary">
                  Flight Booking Automation
                </h1>
                <p className="text-muted-foreground mt-1">
                  Set your preferences and click Explore to mirror them on
                  booking.com
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Flight Search Form */}
            <Form {...form}>
              <form className="w-full max-w-4xl mx-auto p-4 md:p-6 rounded-xl bg-card border border-border shadow-xl">
                {/* Top Row: Options */}
                <div className="flex flex-wrap items-center gap-6 mb-6">
                  {/* Trip Type Radio Buttons */}
                  <FormField
                    control={form.control}
                    name="tripType"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) =>
                              handleTripTypeChange(
                                value as "round-trip" | "one-way"
                              )
                            }
                            defaultValue={field.value}
                            className="flex items-center gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="round-trip"
                                id="round-trip"
                              />
                              <Label
                                htmlFor="round-trip"
                                className="cursor-pointer"
                              >
                                Round-trip
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="one-way" id="one-way" />
                              <Label
                                htmlFor="one-way"
                                className="cursor-pointer"
                              >
                                One-way
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Travel Class Dropdown */}
                  <FormField
                    control={form.control}
                    name="travelClass"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-[180px] border-none shadow-none hover:bg-muted/50 focus:ring-0">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="economy">Economy</SelectItem>
                            <SelectItem value="premium_economy">
                              Premium Economy
                            </SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="first">First Class</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Direct Flights Checkbox */}
                  <FormField
                    control={form.control}
                    name="directFlights"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="direct-flights"
                          />
                        </FormControl>
                        <Label
                          htmlFor="direct-flights"
                          className="cursor-pointer font-normal"
                        >
                          Direct flights only
                        </Label>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Main Search Area */}
                <div className="flex flex-col gap-4">
                  {/* Row 1: From & To Group */}
                  <div className="flex flex-col md:flex-row gap-0.5 rounded-lg overflow-hidden border">
                    <FormField
                      control={form.control}
                      name="from"
                      render={({ field }) => (
                        <FormItem className="relative flex-1 bg-background p-2 hover:bg-muted/20 transition-colors group space-y-0">
                          <Label className="text-xs text-muted-foreground ml-9">
                            Leaving from
                          </Label>
                          <div className="flex items-center relative">
                            <Plane className="absolute left-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors z-10" />
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border-none shadow-none pl-9 h-8 text-base font-semibold focus:ring-0 bg-transparent w-full">
                                  <SelectValue placeholder="Select origin" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {fromAirportOptions.map((airport) => (
                                  <SelectItem
                                    key={airport.code}
                                    value={airport.code}
                                    disabled={airport.disabled}
                                  >
                                    {airport.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                          {/* <FormMessage className="ml-9 absolute -bottom-5" /> */}
                        </FormItem>
                      )}
                    />

                    <div className="relative flex items-center justify-center bg-background md:w-10 z-10 py-2 md:py-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSwap}
                        className="rounded-full h-8 w-8 bg-background border border-border shadow-sm hover:bg-muted"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="to"
                      render={({ field }) => (
                        <FormItem className="relative flex-1 bg-background p-2 hover:bg-muted/20 transition-colors group space-y-0">
                          <Label className="text-xs text-muted-foreground ml-9">
                            Going to
                          </Label>
                          <div className="flex items-center relative">
                            <Plane className="absolute left-3 h-5 w-5 text-muted-foreground rotate-90 group-hover:text-primary transition-colors z-10" />
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border-none shadow-none pl-9 h-8 text-base font-semibold focus:ring-0 bg-transparent w-full">
                                  <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {toAirportOptions.map((airport) => (
                                  <SelectItem
                                    key={airport.code}
                                    value={airport.code}
                                    disabled={airport.disabled}
                                  >
                                    {airport.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Date Picker & Travelers */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Date Picker */}
                    <FormField
                      control={form.control}
                      name="departDate"
                      render={({ field }) => (
                        <FormItem className="flex-1 rounded-lg border space-y-0">
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full h-full min-h-[60px] justify-start text-left font-normal bg-background hover:bg-muted/20 p-3 rounded-lg",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <div className="flex flex-col items-start w-full">
                                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                                      <CalendarIcon className="h-3 w-3" />
                                      {tripType === "round-trip"
                                        ? "Travel dates"
                                        : "Travel date"}
                                    </span>
                                    <span className="text-base font-semibold mt-1 truncate">
                                      {tripType === "round-trip" ? (
                                        date?.from ? (
                                          date.to ? (
                                            <>
                                              {format(date.from, "EEE, LLL d")}{" "}
                                              – {format(date.to, "EEE, LLL d")}
                                            </>
                                          ) : (
                                            format(
                                              date.from,
                                              "EEE, LLL d, yyyy"
                                            )
                                          )
                                        ) : (
                                          <span className="text-muted-foreground">
                                            Select dates
                                          </span>
                                        )
                                      ) : singleDate ? (
                                        format(singleDate, "EEE, LLL d")
                                      ) : (
                                        <span className="text-muted-foreground">
                                          Select date
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              {tripType === "round-trip" ? (
                                <Calendar
                                  initialFocus
                                  mode="range"
                                  defaultMonth={date?.from || new Date()}
                                  selected={date}
                                  onSelect={handleDateRangeSelect}
                                  numberOfMonths={2}
                                  disabled={isDateDisabled}
                                  className="rounded-md"
                                />
                              ) : (
                                <Calendar
                                  initialFocus
                                  mode="single"
                                  defaultMonth={singleDate || new Date()}
                                  selected={singleDate}
                                  onSelect={handleSingleDateSelect}
                                  numberOfMonths={2}
                                  disabled={isDateDisabled}
                                  className="rounded-md"
                                />
                              )}
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="ml-2 absolute mt-1" />
                        </FormItem>
                      )}
                    />

                    {/* Travelers */}
                    <div className="flex-1 rounded-lg border">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full h-full min-h-[60px] justify-start text-left font-normal bg-background hover:bg-muted/20 p-3 rounded-lg"
                          >
                            <div className="flex flex-col items-start w-full">
                              <span className="text-xs text-muted-foreground flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                Travelers
                              </span>
                              <span className="text-base font-semibold mt-1">
                                {adults} {adults === 1 ? "adult" : "adults"}
                              </span>
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4">
                          <div className="space-y-4">
                            {/* Adults */}
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-base font-medium">
                                  Adult
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Age 18+
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-md"
                                  onClick={handleAdultsDecrement}
                                  disabled={(adults || 1) <= 1}
                                >
                                  <span className="text-lg">−</span>
                                </Button>
                                <span className="w-6 text-center font-semibold text-lg">
                                  {adults || 1}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-md"
                                  onClick={handleAdultsIncrement}
                                  disabled={(adults || 1) >= 9}
                                >
                                  <span className="text-lg">+</span>
                                </Button>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  {adults || 1}{" "}
                                  {(adults || 1) === 1
                                    ? "traveler"
                                    : "travelers"}
                                </span>
                                <PopoverClose asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                  >
                                    Done
                                  </Button>
                                </PopoverClose>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Explore Button */}
                  <Button
                    type="button"
                    onClick={runAutomation}
                    disabled={isRunning}
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-lg mt-2"
                  >
                    {isRunning ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Running Automation...
                      </div>
                    ) : (
                      "Explore"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Flight Results - Outside form, inside Form provider */}
            {result && (
              <div className="max-w-4xl mx-auto my-6 space-y-6 animate-in slide-in-from-bottom-4">
                {result.flights && result.flights.length > 0 && (
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plane className="h-5 w-5 text-primary" />
                        Flight Results
                        {result.totalResults && (
                          <span className="text-sm font-normal text-muted-foreground">
                            ({result.totalResults} total results)
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Showing top {result.flights.length} flights from
                        booking.com
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.flights.map((flight, index) => (
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
                                    <div className="text-xl font-bold">
                                      {flight.departureTime}
                                    </div>
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
                                            flight.stops.toLowerCase() ===
                                            "direct"
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
                                    <div className="text-xl font-bold">
                                      {flight.arrivalTime}
                                    </div>
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
                                <div className="text-2xl font-bold text-primary">
                                  {flight.price}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Info Banner - Outside form, inside Form provider */}
            <div className="w-full max-w-4xl mx-auto mt-6 p-4 rounded-xl border-2 border-primary bg-card">
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-primary">AI Automation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click <strong>Explore</strong> to start the automation. The
                    AI will navigate to booking.com and set:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>
                      Trip type:{" "}
                      <strong>
                        {tripType === "round-trip" ? "Round-trip" : "One-way"}
                      </strong>
                    </li>
                    <li>
                      Travel class:{" "}
                      <strong>
                        {travelClassDisplay[travelClass] || travelClass}
                      </strong>{" "}
                      <span className="text-xs opacity-70">
                        (booking.com: {travelClassBookingDisplay[travelClass]})
                      </span>
                    </li>
                    <li>
                      Origin: <strong>{fromAirport || "Auto-detected"}</strong>
                    </li>
                    <li>
                      Destination:{" "}
                      <strong>{toAirport || "Not selected"}</strong>
                    </li>
                    <li>
                      Travel dates:{" "}
                      <strong>
                        {departDate
                          ? tripType === "round-trip" && returnDate
                            ? `${departDate} – ${returnDate}`
                            : departDate
                          : "Not selected"}
                      </strong>
                    </li>
                    <li>
                      Direct flights only:{" "}
                      <strong>{directFlights ? "Yes" : "No"}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isRunning && (
              <Card className="max-w-4xl mx-auto border-2 border-primary/30 animate-pulse">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Running Automation...
                  </CardTitle>
                  <CardDescription>
                    Playwright is navigating to booking.com and Gemini is
                    analyzing the page...
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Results */}
            {result && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                {/* Overall Result */}
                <Card
                  className={`border-2 ${result.success ? "border-primary/50 bg-primary/5" : "border-secondary/50 bg-secondary/5"}`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <XCircle className="h-6 w-6 text-secondary-foreground" />
                      )}
                      {result.success
                        ? "Automation Successful!"
                        : "Automation Completed with Issues"}
                    </CardTitle>
                    <CardDescription>{result.message}</CardDescription>
                  </CardHeader>
                  {result.requested && (
                    <CardContent>
                      <div className="flex flex-wrap gap-4">
                        <div className="px-3 py-1 rounded-full bg-muted text-sm">
                          Trip: <strong>{result.requested.tripType}</strong>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-muted text-sm">
                          Class: <strong>{result.requested.travelClass}</strong>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-muted text-sm">
                          Route:{" "}
                          <strong>
                            {result.requested.from || "Auto"} →{" "}
                            {result.requested.to || "N/A"}
                          </strong>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-muted text-sm">
                          Direct:{" "}
                          <strong>
                            {result.requested.directFlights ? "Yes" : "No"}
                          </strong>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Steps Timeline */}
                {result.steps && result.steps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Execution Steps</CardTitle>
                      <CardDescription>
                        Detailed breakdown of each automation step
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.steps.map((step, index) => (
                          <div
                            key={index}
                            className="flex gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {getStepIcon(step)}
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  Step {step.step}:
                                </span>
                                <span className="text-muted-foreground">
                                  {step.action}
                                </span>
                              </div>
                              <p className="text-sm">{step.result}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Analysis Details */}
                {result.analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        AI Analysis Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                          <h4 className="font-medium mb-2">Initial Analysis</h4>
                          <ul className="text-sm space-y-1">
                            <li>
                              <span className="text-muted-foreground">
                                Trip type found:
                              </span>{" "}
                              <span
                                className={
                                  result.analysis.initial.tripTypeFound
                                    ? "text-primary"
                                    : "text-destructive"
                                }
                              >
                                {result.analysis.initial.tripTypeFound
                                  ? "Yes"
                                  : "No"}
                              </span>
                              {result.analysis.initial.currentTripType && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({result.analysis.initial.currentTripType})
                                </span>
                              )}
                            </li>
                            <li>
                              <span className="text-muted-foreground">
                                Class dropdown found:
                              </span>{" "}
                              <span
                                className={
                                  result.analysis.initial.classDropdownFound
                                    ? "text-primary"
                                    : "text-destructive"
                                }
                              >
                                {result.analysis.initial.classDropdownFound
                                  ? "Yes"
                                  : "No"}
                              </span>
                              {result.analysis.initial.currentClass && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({result.analysis.initial.currentClass})
                                </span>
                              )}
                            </li>
                            <li>
                              <span className="text-muted-foreground">
                                Direct flights checkbox:
                              </span>{" "}
                              <span
                                className={
                                  result.analysis.initial.directFlightsFound
                                    ? "text-primary"
                                    : "text-destructive"
                                }
                              >
                                {result.analysis.initial.directFlightsFound
                                  ? "Found"
                                  : "Not found"}
                              </span>
                              {result.analysis.initial.directFlightsFound && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  (
                                  {result.analysis.initial.directFlightsChecked
                                    ? "checked"
                                    : "unchecked"}
                                  )
                                </span>
                              )}
                            </li>
                          </ul>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <h4 className="font-medium mb-2">After Actions</h4>
                          <ul className="text-sm space-y-1">
                            {result.analysis.verification.tripType && (
                              <li>
                                <span className="text-muted-foreground">
                                  Trip type:
                                </span>{" "}
                                <span className="text-foreground">
                                  {result.analysis.verification.tripType}
                                </span>
                              </li>
                            )}
                            {result.analysis.verification.travelClass && (
                              <li>
                                <span className="text-muted-foreground">
                                  Travel class:
                                </span>{" "}
                                <span className="text-foreground">
                                  {result.analysis.verification.travelClass}
                                </span>
                              </li>
                            )}
                            <li>
                              <span className="text-muted-foreground">
                                Direct flights:
                              </span>{" "}
                              <span
                                className={
                                  result.analysis.verification
                                    .directFlightsChecked
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }
                              >
                                {result.analysis.verification
                                  .directFlightsChecked
                                  ? "Checked"
                                  : "Unchecked"}
                              </span>
                            </li>
                            <li>
                              <span className="text-muted-foreground">
                                Success:
                              </span>{" "}
                              <span
                                className={
                                  result.analysis.verification.success
                                    ? "text-primary"
                                    : "text-destructive"
                                }
                              >
                                {result.analysis.verification.success
                                  ? "Yes"
                                  : "No"}
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
