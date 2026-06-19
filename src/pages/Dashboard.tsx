import { useGetDashboard } from "@workspace/api-client-react";
import { GrandMarketCard } from "@/components/GrandMarketCard";
import { MarketCard } from "@/components/MarketCard";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Activity, Clock, CheckCircle2, PlusCircle } from "lucide-react";
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

  const grandQuestion = dashboard.settings.grandMarketTitle;

  return (
    <div className="space-y-12 pb-12">
      <section>
        <GrandMarketCard
          title={grandQuestion}
          currentCount={dashboard.settings.cumulativeShots}
          grandLine={dashboard.settings.grandLine}
          overPercentage={dashboard.grandMarketSummary.overPct}
          underPercentage={dashboard.grandMarketSummary.underPct}
          href="/grand"
        />
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
        <Card className="border-dashed bg-card/60">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 rounded-full border border-border bg-background p-3 text-muted-foreground">
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              No active sessions
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Waiting for the admin to open a new market.
            </p>
            <Button asChild className="mt-6">
              <Link href="/admin">Open new market</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
