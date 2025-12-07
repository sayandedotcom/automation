"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Car, UtensilsCrossed } from "lucide-react";

export default function Home() {
  const automations = [
    {
      id: "flights",
      title: "Flight Booking",
      description: "Search flights automatically",
      icon: Plane,
      href: "/flights",
      available: true,
    },
    {
      id: "uber",
      title: "Uber Booking",
      description: "Get ride pricing info",
      icon: Car,
      href: "/uber",
      available: false,
    },
    {
      id: "swiggy",
      title: "Swiggy Favourites",
      description: "Order from favourites",
      icon: UtensilsCrossed,
      href: "/swiggy",
      available: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-5xl w-full mx-auto py-20">
        {/* Minimal Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 tracking-tight">
            Automation
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light">
            Streamline your daily tasks with intelligent automation
          </p>
        </div>

        {/* Automation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {automations.map((automation) => {
            const Icon = automation.icon;
            
            if (!automation.available) {
              return (
                <Card
                  key={automation.id}
                  className="bg-card border-border hover:border-muted-foreground/20 transition-all duration-300 cursor-not-allowed opacity-40"
                >
                  <CardHeader className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{automation.title}</CardTitle>
                    <CardDescription className="text-sm">{automation.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Link key={automation.id} href={automation.href}>
                <Card className="bg-card border-border hover:border-primary transition-all duration-300 cursor-pointer group h-full">
                  <CardHeader className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
                      {automation.title}
                    </CardTitle>
                    <CardDescription className="text-sm">{automation.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xs text-primary font-medium">Get Started →</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Minimal Footer */}
        <div className="mt-20 text-center">
          <p className="text-sm text-muted-foreground">
            Built with Next.js, Playwright & Vercel AI SDK
          </p>
        </div>
      </div>
    </div>
  );
}
