import { Bot } from "lucide-react";
import { ReactNode } from "react";

interface InfoBannerProps {
  title?: string;
  children: ReactNode;
  warning?: string;
}

export function InfoBanner({
  title = "AI Automation",
  children,
  warning,
}: InfoBannerProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 rounded-xl border-2 border-primary bg-card">
      <div className="flex items-start gap-3">
        <Bot className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="font-medium text-primary">{title}</p>
          <div className="text-sm text-muted-foreground mt-1">{children}</div>
          {warning && (
            <p className="text-sm text-destructive mt-3">
              ⚠️ <strong>Note:</strong> {warning}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
