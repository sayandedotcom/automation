import {
  CheckCircle2,
  XCircle,
  Bot,
  MousePointer2,
  Camera,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface AutomationStep {
  step: number;
  action: string;
  result: string;
  timestamp: string;
}

interface AutomationStepsProps {
  steps: AutomationStep[];
}

function getStepIcon(step: AutomationStep) {
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

  if (
    step.action.toLowerCase().includes("screenshot") ||
    step.action.toLowerCase().includes("capture")
  ) {
    return <Camera className="h-5 w-5 text-primary" />;
  } else if (
    step.action.toLowerCase().includes("gemini") ||
    step.action.toLowerCase().includes("ai") ||
    step.action.toLowerCase().includes("extract")
  ) {
    return <Bot className="h-5 w-5 text-primary" />;
  } else if (
    step.action.toLowerCase().includes("click") ||
    step.action.toLowerCase().includes("select")
  ) {
    return <MousePointer2 className="h-5 w-5 text-secondary-foreground" />;
  }

  return <CheckCircle2 className="h-5 w-5 text-primary" />;
}

export function AutomationSteps({ steps }: AutomationStepsProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Steps</CardTitle>
        <CardDescription>
          Detailed breakdown of each automation step
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex-shrink-0">{getStepIcon(step)}</div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Step {step.step}:</span>
                  <span className="text-muted-foreground">{step.action}</span>
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
  );
}
