"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  MousePointer2,
  MapPin,
  Navigation,
  Car,
  ArrowRightLeft,
  LogIn,
  LogOut,
  RefreshCw,
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
import { z } from "zod";

// Schema for Uber ride search
const uberSearchSchema = z.object({
  pickup: z.string().min(3, "Pickup location must be at least 3 characters"),
  dropoff: z.string().min(3, "Dropoff location must be at least 3 characters"),
});

type UberSearchInput = z.infer<typeof uberSearchSchema>;

interface AutomationStep {
  step: number;
  action: string;
  result: string;
  timestamp: string;
}

interface RideOption {
  name: string;
  description?: string;
  fare: string;
  eta?: string;
  capacity?: string;
}

interface AutomationResult {
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

export default function UberPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSettingUpAuth, setIsSettingUpAuth] = useState(false);
  const [authLastModified, setAuthLastModified] = useState<string | null>(null);

  const form = useForm<UberSearchInput>({
    resolver: zodResolver(uberSearchSchema),
    defaultValues: {
      pickup: "",
      dropoff: "",
    },
  });

  // Check auth status on mount
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/uber/auth");
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      setAuthLastModified(data.lastModified);
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setIsAuthenticated(false);
    }
  };

  // Setup authentication
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

      if (data.success) {
        toast.success("✅ " + data.message);
        setIsAuthenticated(true);
        checkAuthStatus();
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

  // Clear authentication
  const clearAuth = async () => {
    try {
      const response = await fetch("/api/uber/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Session cleared");
        setIsAuthenticated(false);
        setAuthLastModified(null);
      }
    } catch (error) {
      console.error("Failed to clear auth:", error);
    }
  };

  // Check auth on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Watch values
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
    console.log("🚗 Starting Uber automation with:", formData);

    try {
      const response = await fetch("/api/uber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup: formData.pickup,
          dropoff: formData.dropoff,
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
  }, [form]);

  const handleSwap = useCallback(() => {
    const pickup = form.getValues("pickup");
    const dropoff = form.getValues("dropoff");
    form.setValue("pickup", dropoff);
    form.setValue("dropoff", pickup);
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
    } else if (step.result.includes("🔒")) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }

    if (step.action.toLowerCase().includes("capture")) {
      return <Bot className="h-5 w-5 text-primary" />;
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
                <Car className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-primary">
                  Uber Rides Automation
                </h1>
                <p className="text-muted-foreground mt-1">
                  Enter pickup and dropoff locations to see available rides and
                  fares
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Auth Status Card */}
            <Card
              className={`max-w-4xl mx-auto border-2 ${
                isAuthenticated === null
                  ? "border-muted"
                  : isAuthenticated
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-amber-500/50 bg-amber-500/5"
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {isAuthenticated === null ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Checking authentication...
                    </>
                  ) : isAuthenticated ? (
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
                {authLastModified && (
                  <CardDescription>
                    Session saved: {new Date(authLastModified).toLocaleString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {isAuthenticated ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkAuthStatus}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAuth}
                      className="text-destructive hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Clear Session
                    </Button>
                  </div>
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
                {/* Main Search Area */}
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
                      if (!isAuthenticated) {
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

            {/* Ride Results - Outside form */}
            {result && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                {result.rides && result.rides.length > 0 && (
                  <Card className="border-primary/30 shadow-lg">
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
                            className="p-4 rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:shadow-md transition-all"
                          >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              {/* Ride Info */}
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

                                {/* Extra Info */}
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

                              {/* Price */}
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
              </div>
            )}

            {/* Info Banner - Outside form */}
            <div className="w-full max-w-4xl mx-auto p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-primary">AI Automation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click <strong>Search Uber Rides</strong> to start the
                    automation. The AI will:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>Navigate to Uber website</li>
                    <li>Check if you are logged in</li>
                    <li>
                      Fill in pickup: <strong>{pickup || "Not entered"}</strong>
                    </li>
                    <li>
                      Fill in dropoff:{" "}
                      <strong>{dropoff || "Not entered"}</strong>
                    </li>
                    <li>Extract available rides and fares</li>
                  </ul>
                  <p className="text-sm text-destructive mt-3">
                    ⚠️ <strong>Note:</strong> You should be logged into Uber in
                    the browser for full functionality.
                  </p>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isRunning && (
              <Card className="max-w-4xl mx-auto border-2 border-primary/30 animate-pulse">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    Running Uber Automation...
                  </CardTitle>
                  <CardDescription>
                    Playwright is navigating to Uber and searching for available
                    rides...
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Results */}
            {result && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                {/* Auth Required Warning */}
                {result.authRequired && (
                  <Card className="border-2 border-destructive/50 bg-destructive/5">
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

                {/* Overall Result */}
                {!result.authRequired && (
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
                            Pickup: <strong>{result.requested.pickup}</strong>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-muted text-sm">
                            Dropoff: <strong>{result.requested.dropoff}</strong>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

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
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
