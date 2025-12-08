"use client";

import { useState } from "react";
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
  Camera,
  MousePointer2,
  MapPin,
  Navigation,
  Car,
  ArrowRightLeft,
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
  screenshotUrl?: string;
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

  const form = useForm<UberSearchInput>({
    resolver: zodResolver(uberSearchSchema),
    defaultValues: {
      pickup: "",
      dropoff: "",
    },
  });

  const runAutomation = async () => {
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
  };

  const handleSwap = () => {
    const pickup = form.getValues("pickup");
    const dropoff = form.getValues("dropoff");
    form.setValue("pickup", dropoff);
    form.setValue("dropoff", pickup);
  };

  const getStepIcon = (step: AutomationStep) => {
    if (step.result.includes("✅")) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else if (step.result.includes("❌")) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (step.result.includes("⚠️")) {
      return <CheckCircle2 className="h-5 w-5 text-yellow-500" />;
    } else if (step.result.includes("ℹ️")) {
      return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
    } else if (step.result.includes("🔒")) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }

    if (step.action.toLowerCase().includes("screenshot")) {
      return <Camera className="h-5 w-5 text-blue-500" />;
    } else if (
      step.action.toLowerCase().includes("gemini") ||
      step.action.toLowerCase().includes("ai")
    ) {
      return <Bot className="h-5 w-5 text-purple-500" />;
    } else if (
      step.action.toLowerCase().includes("click") ||
      step.action.toLowerCase().includes("select")
    ) {
      return <MousePointer2 className="h-5 w-5 text-orange-500" />;
    }

    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-black/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gray-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse" />
      </div>

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
              <div className="p-3 bg-gradient-to-br from-black to-gray-700 rounded-xl shadow-lg">
                <Car className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-black to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
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
                            <MapPin className="absolute left-3 h-5 w-5 text-green-500 group-hover:text-green-600 transition-colors z-10" />
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter pickup location"
                                className="border-none shadow-none pl-9 h-8 text-base font-semibold focus-visible:ring-0 bg-transparent w-full"
                              />
                            </FormControl>
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
                      name="dropoff"
                      render={({ field }) => (
                        <FormItem className="relative flex-1 bg-background p-2 hover:bg-muted/20 transition-colors group space-y-0">
                          <Label className="text-xs text-muted-foreground ml-9">
                            Dropoff location
                          </Label>
                          <div className="flex items-center relative">
                            <Navigation className="absolute left-3 h-5 w-5 text-red-500 group-hover:text-red-600 transition-colors z-10" />
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter dropoff location"
                                className="border-none shadow-none pl-9 h-8 text-base font-semibold focus-visible:ring-0 bg-transparent w-full"
                              />
                            </FormControl>
                          </div>
                          <FormMessage className="ml-9 absolute -bottom-5" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Search Button */}
                  <Button
                    type="button"
                    onClick={runAutomation}
                    disabled={isRunning}
                    className="w-full h-14 text-lg font-semibold bg-black hover:bg-gray-800 text-white shadow-lg rounded-lg mt-2"
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

                {/* Info Banner */}
                <div className="mt-6 p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-gray-700 dark:text-gray-300 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        AI Automation
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click <strong>Search Uber Rides</strong> to start the
                        automation. The AI will:
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                        <li>Navigate to Uber website</li>
                        <li>Check if you are logged in</li>
                        <li>Fill in pickup and dropoff locations</li>
                        <li>Extract available rides and fares</li>
                      </ul>
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                        ⚠️ <strong>Note:</strong> You should be logged into Uber
                        in the browser for full functionality.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </Form>

            {/* Loading State */}
            {isRunning && (
              <Card className="max-w-4xl mx-auto border-2 border-black/30 dark:border-white/30 animate-pulse">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-black dark:text-white" />
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
                  <Card className="border-2 border-red-500/50 bg-red-500/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-500">
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
                    className={`border-2 ${result.success ? "border-green-500/50 bg-green-500/5" : "border-yellow-500/50 bg-yellow-500/5"}`}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-yellow-500" />
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

                {/* Ride Options */}
                {result.rides && result.rides.length > 0 && (
                  <Card className="border-black/30 dark:border-white/30 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
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
                                  <div className="p-2 bg-black rounded-lg">
                                    <Car className="h-6 w-6 text-white" />
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
                                <div className="text-2xl font-bold text-black dark:text-white">
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

                {/* Screenshots */}
                {result.steps && result.steps.some((s) => s.screenshotUrl) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Screenshots
                      </CardTitle>
                      <CardDescription>
                        Visual proof of automation execution
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6">
                        {result.steps
                          .filter((s) => s.screenshotUrl)
                          .map((step, index) => (
                            <div key={index} className="space-y-2">
                              <p className="text-sm font-medium">
                                Step {step.step}: {step.action}
                              </p>
                              <div className="rounded-lg overflow-hidden border-2 border-muted shadow-lg">
                                <img
                                  src={step.screenshotUrl}
                                  alt={`Screenshot for step ${step.step}`}
                                  className="w-full h-auto"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Saved to: public{step.screenshotUrl}
                              </p>
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
