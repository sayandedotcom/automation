"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Car,
  Sparkles,
  ArrowRight,
  Bot,
  Zap,
  Globe,
} from "lucide-react";

const automations = [
  {
    id: "flights",
    title: "Flight Booking",
    description:
      "Search and compare flights across booking.com with AI-powered automation",
    icon: Plane,
    href: "/flights",
    available: true,
    borderColor: "border-blue-500",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    features: ["Multi-city search", "Price comparison", "Date flexibility"],
  },
  {
    id: "uber",
    title: "Uber Rides",
    description: "Get real-time ride pricing and availability from Uber",
    icon: Car,
    href: "/uber",
    available: true,
    borderColor: "border-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    features: ["Live pricing", "Multiple ride options", "ETA estimates"],
  },
];

const techStack = [
  { name: "Next.js", icon: Globe },
  { name: "Playwright", icon: Bot },
  { name: "Google Gemini", icon: Sparkles },
  { name: "Vercel AI SDK", icon: Zap },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-slide-up">
          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Powered by AI
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Browser</span>
            <br />
            <span className="text-primary">Automation</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Automate your daily tasks with intelligent AI agents that interact
            with websites just like you would
          </p>
        </div>

        {/* Automation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {automations.map((automation) => {
            const Icon = automation.icon;

            return (
              <Link
                key={automation.id}
                href={automation.href}
                className="group"
              >
                <Card
                  className={`
                  h-full
                  border-2 ${automation.borderColor}
                  bg-card
                  transition-all duration-300
                  hover:shadow-lg
                  hover:-translate-y-0.5
                `}
                >
                  <CardHeader className="space-y-4 pb-4">
                    {/* Icon */}
                    <div
                      className={`
                      w-12 h-12 rounded-xl ${automation.iconBg}
                      flex items-center justify-center
                      border border-border
                    `}
                    >
                      <Icon className={`h-6 w-6 ${automation.iconColor}`} />
                    </div>

                    {/* Title & Description */}
                    <div>
                      <CardTitle className="text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors duration-200 mb-2">
                        {automation.title}
                      </CardTitle>
                      <CardDescription className="text-base text-muted-foreground leading-relaxed">
                        {automation.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Feature tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {automation.features.map((feature) => (
                        <Badge
                          key={feature}
                          variant="outline"
                          className="text-muted-foreground border-border text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <span>Start Automation</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* How it works section */}
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            How it works
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10">
            Our AI agents use Playwright to control a real browser and Gemini
            Vision to understand what&apos;s on screen
          </p>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Configure", desc: "Set your preferences" },
              {
                step: "2",
                title: "Automate",
                desc: "AI fills forms & navigates",
              },
              { step: "3", title: "Results", desc: "Get extracted data" },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative p-6 rounded-xl bg-card border-2 border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">{item.step}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 2 && (
                  <ArrowRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack Footer */}
        <div className="border-t-2 border-border pt-10">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground mb-2">Built with</p>
            <div className="flex flex-wrap justify-center gap-3">
              {techStack.map((tech) => {
                const TechIcon = tech.icon;
                return (
                  <div
                    key={tech.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                  >
                    <TechIcon className="h-4 w-4" />
                    <span>{tech.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
