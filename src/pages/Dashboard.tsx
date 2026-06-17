import { useGetDashboard } from "@workspace/api-client-react";
import { MarketCard } from "@/components/MarketCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ProgressBar";
import { Flame, Activity, Clock, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const grandQuestion = `Will ${dashboard.settings.trackedPersonName} drink ${dashboard.settings.grandLine} shots of alcohol?`;

  return (
    <div className="space-y-16 pb-12">
      {/* Grand Market Hero Card */}
      <section>
        <Link href="/grand">
          <Card className="hover-elevate cursor-pointer border-primary bg-card overflow-hidden relative group">
            <CardHeader>
              <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <Flame className="w-5 h-5" />
                <span className="font-medium text-xs">Grand Total Market</span>
              </div>
              <CardTitle className="text-4xl md:text-6xl font-medium tracking-normal leading-none">
                {grandQuestion}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-end mt-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Current Count</div>
                  <div className="text-6xl font-medium text-foreground leading-none">
                    {dashboard.settings.cumulativeShots}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Grand Line</div>
                  <div className="text-6xl font-medium text-muted-foreground leading-none">
                    {dashboard.settings.grandLine}
                  </div>
                </div>
                <div className="flex-1 w-full md:w-auto self-center pt-4 md:pt-0">
                  <ProgressBar 
                    overPct={dashboard.grandMarketSummary.overPct} 
                    underPct={dashboard.grandMarketSummary.underPct} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Active Events */}
      {dashboard.activeEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-2xl font-medium">Active Markets</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.activeEvents.map(event => (
              <MarketCard key={event.id} event={event} overPct={50} underPct={50} />
            ))}
          </div>
        </section>
      )}

      {/* Pending Resolution */}
      {dashboard.pendingEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <h2 className="text-2xl font-medium text-foreground">Awaiting Results</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {dashboard.pendingEvents.map(event => (
              <MarketCard key={event.id} event={event} overPct={50} underPct={50} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Resolved */}
      {dashboard.resolvedEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-2xl font-medium text-foreground">Recently Settled</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {dashboard.resolvedEvents.slice(0, 3).map(event => (
              <MarketCard key={event.id} event={event} overPct={50} underPct={50} />
            ))}
          </div>
        </section>
      )}
      
      {dashboard.activeEvents.length === 0 && dashboard.pendingEvents.length === 0 && (
        <div className="text-center py-24 bg-card/30 rounded-xl border border-border border-dashed">
          <h3 className="text-xl font-medium text-muted-foreground">No active sessions</h3>
          <p className="text-muted-foreground mt-2">Waiting for the admin to open a new market.</p>
        </div>
      )}
    </div>
  );
}
