"use client";

import { useState, useCallback, useEffect } from "react";
import useLocalStorage from "use-local-storage";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  Navigation,
  Car,
  ArrowRightLeft,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  Form,
  FormControl,
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
import { uberSearchSchema, type UberSearchInput } from "@/lib/schema/uber";
import { AutomationResult, UberStorageState } from "@/lib/types/uber";
import {
  PageHeader,
  AutomationSteps,
  ResultCard,
  LoadingCard,
  InfoBanner,
} from "@/components/automation";

export default function UberPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [isSettingUpAuth, setIsSettingUpAuth] = useState(false);

  const [authState, setAuthState] = useLocalStorage<UberStorageState | null>(
    "uber-auth-state",
    null
  );
  const [authTimestamp, setAuthTimestamp] = useLocalStorage<string | null>(
    "uber-auth-timestamp",
    null
  );

  const form = useForm<UberSearchInput>({
    resolver: zodResolver(uberSearchSchema),
    defaultValues: {
      pickup: "",
      dropoff: "",
    },
  });

  const isAuthenticated = useCallback(() => {
    if (!authState || !authTimestamp) return false;
    const timestamp = new Date(authTimestamp);
    const now = new Date();
    const ageInDays =
      (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= 7;
  }, [authState, authTimestamp]);

  const getAuthLastModified = useCallback(() => {
    if (!authTimestamp) return null;
    return authTimestamp;
  }, [authTimestamp]);

  const setupAuth = async () => {
    setIsSettingUpAuth(true);
    toast.info(
      "🔐 Opening browser for Uber login... Please login within 2 minutes."
    );

    try {
      const response = await fetch("/api/uber/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });

      const data = await response.json();

      if (data.success && data.authState) {
        setAuthState(data.authState);
        setAuthTimestamp(new Date().toISOString());
        toast.success("✅ " + data.message);
      } else {
        toast.error("❌ " + data.message);
      }
    } catch (error) {
      console.error("Auth setup error:", error);
      toast.error("Failed to setup authentication");
    } finally {
      setIsSettingUpAuth(false);
    }
  };

  const clearAuth = () => {
    setAuthState(null);
    setAuthTimestamp(null);
    toast.success("Session cleared");
  };

  // Note: localStorage is read automatically by useLocalStorage hook

  const pickup = form.watch("pickup");
  const dropoff = form.watch("dropoff");

  const runAutomation = useCallback(async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please fill in both pickup and dropoff locations");
      return;
    }

    const formData = form.getValues();

    setIsRunning(true);
    setResult(null);

    toast.info(
      "🚗 Starting Uber automation - Checking availability and fares..."
    );

    try {
      const response = await fetch("/api/uber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: formData.pickup,
          dropoff: formData.dropoff,
          authState: authState,
        }),
      });

      const data: AutomationResult = await response.json();
      setResult(data);

      if (data.authRequired) {
        toast.error("🔒 Authentication required - Please login to Uber first");
      } else if (data.success) {
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
  }, [form, authState]);

  const handleSwap = useCallback(() => {
    const pickup = form.getValues("pickup");
    const dropoff = form.getValues("dropoff");
    form.setValue("pickup", dropoff);
    form.setValue("dropoff", pickup);
  }, [form]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        {/* Header */}
        <PageHeader
          title="Uber Rides Automation"
          description="Enter pickup and dropoff locations to see available rides and fares"
          icon={Car}
        />

        {/* Main Content */}
        <main className="px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Auth Status Card */}
            <Card
              className={`max-w-4xl mx-auto border-2 ${
                !authState
                  ? "border-amber-500/50 bg-amber-500/5"
                  : isAuthenticated()
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-amber-500/50 bg-amber-500/5"
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {isAuthenticated() ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Uber Session Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-amber-500" />
                      Uber Login Required
                    </>
                  )}
                </CardTitle>
                {getAuthLastModified() && (
                  <CardDescription>
                    Session saved:{" "}
                    {new Date(getAuthLastModified()!).toLocaleString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {isAuthenticated() ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAuth}
                    className="text-destructive hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Clear Session
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You need to login to Uber before searching for rides.
                      Click the button below to open a browser and login.
                    </p>
                    <Button
                      onClick={setupAuth}
                      disabled={isSettingUpAuth}
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      {isSettingUpAuth ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Waiting for login...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          Setup Uber Login
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Uber Search Form */}
            <Form {...form}>
              <form className="w-full max-w-4xl mx-auto p-4 md:p-6 rounded-xl bg-card border border-border shadow-xl">
                <div className="flex flex-col gap-4">
                  {/* Pickup & Dropoff Group */}
                  <div className="flex flex-col md:flex-row gap-0.5 rounded-lg overflow-hidden border">
                    <FormField
                      control={form.control}
                      name="pickup"
                      render={({ field }) => (
                        <FormItem className="relative flex-1 bg-background p-2 hover:bg-muted/20 transition-colors group space-y-0">
                          <Label className="text-xs text-muted-foreground ml-9">
                            Pickup location
                          </Label>
                          <div className="flex items-center relative">
                            <MapPin className="absolute left-3 h-5 w-5 text-primary group-hover:text-primary/80 transition-colors z-10" />
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter pickup location"
                                className="border-none shadow-none pl-9 h-8 text-base font-semibold focus-visible:ring-0 bg-transparent w-full"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
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
                      name="dropoff"
                      render={({ field }) => (
                        <FormItem className="relative flex-1 bg-background p-2 hover:bg-muted/20 transition-colors group space-y-0">
                          <Label className="text-xs text-muted-foreground ml-9">
                            Dropoff location
                          </Label>
                          <div className="flex items-center relative">
                            <Navigation className="absolute left-3 h-5 w-5 text-destructive group-hover:text-destructive/80 transition-colors z-10" />
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter dropoff location"
                                className="border-none shadow-none pl-9 h-8 text-base font-semibold focus-visible:ring-0 bg-transparent w-full"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Search Button */}
                  <Button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated()) {
                        toast.error(
                          "🔒 You have to login/signup to Uber first before searching for rides."
                        );
                        return;
                      }
                      runAutomation();
                    }}
                    disabled={isRunning}
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-lg mt-2"
                  >
                    {isRunning ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Searching for rides...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        Search Uber Rides
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Ride Results */}
            {result && result.rides && result.rides.length > 0 && (
              <Card className="max-w-4xl mx-auto border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Available Rides
                    <span className="text-sm font-normal text-muted-foreground">
                      ({result.rides.length} options)
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Showing top {result.rides.length} ride options from Uber
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.rides.map((ride, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl border-2 border-border bg-card hover:border-primary/50 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary rounded-lg">
                                <Car className="h-6 w-6 text-primary-foreground" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold">
                                  {ride.name}
                                </h3>
                                {ride.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {ride.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4 mt-2">
                              {ride.eta && (
                                <span className="text-sm text-muted-foreground">
                                  ⏱️ {ride.eta}
                                </span>
                              )}
                              {ride.capacity && (
                                <span className="text-sm text-muted-foreground">
                                  👥 {ride.capacity}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right md:min-w-[140px]">
                            <div className="text-2xl font-bold text-primary">
                              {ride.fare}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Banner */}
            <InfoBanner warning="You should be logged into Uber in the browser for full functionality.">
              <p>
                Click <strong>Search Uber Rides</strong> to start the
                automation. The AI will:
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Navigate to Uber website</li>
                <li>Check if you are logged in</li>
                <li>
                  Fill in pickup: <strong>{pickup || "Not entered"}</strong>
                </li>
                <li>
                  Fill in dropoff: <strong>{dropoff || "Not entered"}</strong>
                </li>
                <li>Extract available rides and fares</li>
              </ul>
            </InfoBanner>

            {/* Loading State */}
            {isRunning && (
              <LoadingCard
                title="Running Uber Automation..."
                description="Playwright is navigating to Uber and searching for available rides..."
              />
            )}

            {/* Results */}
            {result && !result.authRequired && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                <ResultCard
                  success={result.success}
                  message={result.message}
                  badges={
                    result.requested
                      ? [
                          { label: "Pickup", value: result.requested.pickup },
                          { label: "Dropoff", value: result.requested.dropoff },
                        ]
                      : undefined
                  }
                />
                <AutomationSteps steps={result.steps || []} />
              </div>
            )}

            {/* Auth Required Warning */}
            {result?.authRequired && (
              <Card className="max-w-4xl mx-auto border-2 border-destructive/50 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-6 w-6" />
                    Authentication Required
                  </CardTitle>
                  <CardDescription>
                    Please login to Uber in your browser first and then try
                    again. The automation detected login/signup buttons
                    indicating you are not authenticated.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
