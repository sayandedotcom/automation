import { CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ResultBadge {
  label: string;
  value: string;
}

interface ResultCardProps {
  success: boolean;
  message: string;
  badges?: ResultBadge[];
}

export function ResultCard({ success, message, badges }: ResultCardProps) {
  return (
    <Card
      className={`border-2 ${
        success
          ? "border-primary/50 bg-primary/5"
          : "border-secondary/50 bg-secondary/5"
      }`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {success ? (
            <CheckCircle2 className="h-6 w-6 text-primary" />
          ) : (
            <XCircle className="h-6 w-6 text-secondary-foreground" />
          )}
          {success
            ? "Automation Successful!"
            : "Automation Completed with Issues"}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {badges && badges.length > 0 && (
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {badges.map((badge, index) => (
              <div
                key={index}
                className="px-3 py-1 rounded-full bg-muted text-sm"
              >
                {badge.label}: <strong>{badge.value}</strong>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
