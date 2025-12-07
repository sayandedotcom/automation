"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plane, Calendar as CalendarIcon, Users, ArrowRightLeft } from "lucide-react";
import { flightSearchSchema, type FlightSearchInput } from "@/lib/schemas";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";

interface FlightSearchFormProps {
  onSearch: (data: FlightSearchInput) => void;
  isLoading: boolean;
}

const AIRPORTS = [
  { code: "JFK", name: "(JFK) New York" },
  { code: "LHR", name: "(LHR) London" },
  { code: "DXB", name: "(DXB) Dubai" },
  { code: "SIN", name: "(SIN) Singapore" },
  { code: "DEL", name: "(DEL) Delhi" },
  { code: "CCU", name: "(CCU) Kolkata" },
  { code: "BLR", name: "(BLR) Bengaluru" },
];

export function FlightSearchForm({
  onSearch,
  isLoading,
}: FlightSearchFormProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [singleDate, setSingleDate] = useState<Date | undefined>();

  const form = useForm<FlightSearchInput>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: {
      tripType: "round-trip",
      adults: 1,
      children: 0,
      travelClass: "economy",
      directFlights: false,
      from: "",
      to: "",
      departDate: "",
      returnDate: undefined,
    },
  });

  const tripType = form.watch("tripType");

  function onSubmit(data: FlightSearchInput) {
    onSearch(data);
  }

  const handleSwap = () => {
    const from = form.getValues("from");
    const to = form.getValues("to");
    form.setValue("from", to);
    form.setValue("to", from);
  };

  const handleTripTypeChange = (value: "round-trip" | "one-way") => {
    form.setValue("tripType", value);
    if (value === "one-way") {
      form.setValue("returnDate", undefined);
      if (date?.from) {
        setSingleDate(date.from);
      }
    } else {
      if (singleDate) {
        setDate({ from: singleDate, to: undefined });
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-4xl mx-auto p-4 md:p-6 rounded-xl bg-card border border-border shadow-xl"
      >
        {/* Top Row: Options */}
        <div className="flex flex-wrap items-center gap-6 mb-6">
          <FormField
            control={form.control}
            name="tripType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => handleTripTypeChange(value as "round-trip" | "one-way")}
                    defaultValue={field.value}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="round-trip" id="round-trip" />
                      <Label htmlFor="round-trip" className="cursor-pointer">Round-trip</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one-way" id="one-way" />
                      <Label htmlFor="one-way" className="cursor-pointer">One-way</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="travelClass"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-[180px] border-none shadow-none hover:bg-muted/50 focus:ring-0">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium_economy">Premium Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

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
                <Label htmlFor="direct-flights" className="cursor-pointer font-normal">
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
                  <Label className="text-xs text-muted-foreground ml-9">Leaving from</Label>
                  <div className="flex items-center relative">
                    <Plane className="absolute left-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors z-10" />
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-none shadow-none pl-9 h-8 text-base font-semibold focus:ring-0 bg-transparent w-full">
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AIRPORTS.map((airport) => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage className="ml-9 absolute -bottom-5" />
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
                  <Label className="text-xs text-muted-foreground ml-9">Going to</Label>
                  <div className="flex items-center relative">
                    <Plane className="absolute left-3 h-5 w-5 text-muted-foreground rotate-90 group-hover:text-primary transition-colors z-10" />
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-none shadow-none pl-9 h-8 text-base font-semibold focus:ring-0 bg-transparent w-full">
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AIRPORTS.map((airport) => (
                          <SelectItem key={airport.code} value={airport.code}>
                            {airport.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage className="ml-9 absolute -bottom-5" />
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
                              {tripType === "round-trip" ? "Travel dates" : "Travel date"}
                            </span>
                            <span className="text-base font-semibold mt-1 truncate">
                              {tripType === "round-trip" ? (
                                date?.from ? (
                                  date.to ? (
                                    <>
                                      {format(date.from, "EEE, LLL d")} – {format(date.to, "EEE, LLL d")}
                                    </>
                                  ) : (
                                    format(date.from, "EEE, LLL d, yyyy")
                                  )
                                ) : (
                                  <span className="text-muted-foreground">Select dates</span>
                                )
                              ) : (
                                singleDate ? (
                                  format(singleDate, "EEE, LLL d")
                                ) : (
                                  <span className="text-muted-foreground">Select date</span>
                                )
                              )}
                            </span>
                          </div>
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {tripType === "round-trip" ? (
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from || new Date()}
                          selected={date}
                          onSelect={(val) => {
                            setDate(val);
                            if (val?.from) {
                              form.setValue("departDate", format(val.from, "yyyy-MM-dd"), { shouldValidate: true });
                            } else {
                              form.setValue("departDate", "", { shouldValidate: true });
                            }
                            if (val?.to) {
                              form.setValue("returnDate", format(val.to, "yyyy-MM-dd"));
                            } else {
                              form.setValue("returnDate", undefined);
                            }
                          }}
                          numberOfMonths={2}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="rounded-md"
                        />
                      ) : (
                        <Calendar
                          initialFocus
                          mode="single"
                          defaultMonth={singleDate || new Date()}
                          selected={singleDate}
                          onSelect={(val) => {
                            setSingleDate(val);
                            if (val) {
                              form.setValue("departDate", format(val, "yyyy-MM-dd"), { shouldValidate: true });
                              form.setValue("returnDate", undefined); // Clear return date for one-way
                            } else {
                              form.setValue("departDate", "", { shouldValidate: true });
                            }
                          }}
                          numberOfMonths={2}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                        {form.watch("adults")} {form.watch("adults") === 1 ? "adult" : "adults"}
                        {form.watch("children") > 0 && `, ${form.watch("children")} ${form.watch("children") === 1 ? "child" : "children"}`}
                      </span>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-4">
                    {/* Adults */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Adult</Label>
                        <p className="text-sm text-muted-foreground">Age 18+</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-md"
                          onClick={() => form.setValue("adults", Math.max(1, (form.getValues("adults") || 1) - 1))}
                          disabled={(form.watch("adults") || 1) <= 1}
                        >
                          <span className="text-lg">−</span>
                        </Button>
                        <span className="w-6 text-center font-semibold text-lg">{form.watch("adults") || 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-md"
                          onClick={() => form.setValue("adults", Math.min(9, (form.getValues("adults") || 1) + 1))}
                          disabled={(form.watch("adults") || 1) >= 9}
                        >
                          <span className="text-lg">+</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Children */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Children</Label>
                        <p className="text-sm text-muted-foreground">Age 0–17</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-md"
                          onClick={() => form.setValue("children", Math.max(0, (form.getValues("children") || 0) - 1))}
                          disabled={(form.watch("children") || 0) <= 0}
                        >
                          <span className="text-lg">−</span>
                        </Button>
                        <span className="w-6 text-center font-semibold text-lg">{form.watch("children") || 0}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-md"
                          onClick={() => form.setValue("children", Math.min(8, (form.getValues("children") || 0) + 1))}
                          disabled={(form.watch("children") || 0) >= 8}
                        >
                          <span className="text-lg">+</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {(form.watch("adults") || 1) + (form.watch("children") || 0)} {((form.watch("adults") || 1) + (form.watch("children") || 0)) === 1 ? "traveler" : "travelers"}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => document.body.click()} // Close popover
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 3: Search Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-lg mt-2"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Explore"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
