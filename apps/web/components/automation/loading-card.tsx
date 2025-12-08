import { Loader2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LoadingCardProps {
  title?: string;
  description?: string;
}

export function LoadingCard({
  title = "Running Automation...",
  description = "Playwright is navigating and Gemini is analyzing the page...",
}: LoadingCardProps) {
  return (
    <Card className="max-w-4xl mx-auto border-2 border-primary/30 animate-pulse">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
