import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  overPct: number;
  underPct: number;
  className?: string;
}

export function ProgressBar({ overPct, underPct, className }: ProgressBarProps) {
  const over = overPct || 0;
  const under = underPct || 0;
  const total = over + under;
  const overWidth = total === 0 ? 50 : (over / total) * 100;
  const underWidth = total === 0 ? 50 : (under / total) * 100;

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className="flex justify-between text-xs font-medium">
        <span className="text-primary">{Math.round(overWidth)}% OVER</span>
        <span className="text-muted-foreground">{Math.round(underWidth)}% UNDER</span>
      </div>
      <Progress
        value={overWidth}
        aria-label={`${Math.round(overWidth)} percent over, ${Math.round(underWidth)} percent under`}
        className="h-2.5 bg-muted"
      />
    </div>
  );
}
