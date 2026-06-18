import { Link } from "wouter";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProgressBar } from "@/components/ProgressBar";

interface GrandMarketCardProps {
  title: string;
  currentCount: number;
  grandLine: number;
  overPercentage: number;
  underPercentage: number;
  href: string;
}

function MetricTile({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 text-4xl font-semibold leading-none sm:text-5xl ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function GrandMarketCard({
  title,
  currentCount,
  grandLine,
  overPercentage,
  underPercentage,
  href,
}: GrandMarketCardProps) {
  return (
    <Link
      href={href}
      aria-label={`Open grand market: ${title}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="group overflow-hidden border-border bg-card transition-colors hover:border-primary/60">
        <CardHeader className="space-y-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Flame className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Grand Total Market
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              Live pool
            </span>
          </div>
          <CardTitle className="max-w-4xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(260px,1.4fr)]">
            <MetricTile label="Current Count" value={currentCount} />
            <MetricTile label="Grand Line" value={grandLine} muted />
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Market Split
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Over vs under
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-foreground">
                  {Math.round(overPercentage)} / {Math.round(underPercentage)}
                </div>
              </div>
              <ProgressBar
                overPct={overPercentage}
                underPct={underPercentage}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
