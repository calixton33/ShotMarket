import { useGetGrandMarket, usePlaceBetOnGrand, useGetMe, getGetGrandMarketQueryKey, getGetMeQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import { BetForm } from "@/components/BetForm";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Flame } from "lucide-react";

export default function GrandMarket() {
  const { toast } = useToast();
  const { data: user } = useGetMe();
  const { data: market, isLoading } = useGetGrandMarket();
  const placeBetMutation = usePlaceBetOnGrand();

  const handlePlaceBet = (side: "over" | "under", stake: number) => {
    placeBetMutation.mutate(
      { data: { side, stake } },
      {
        onSuccess: () => {
          toast({ title: "Bet placed successfully!", variant: "default" });
          queryClient.invalidateQueries({ queryKey: getGetGrandMarketQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (error) => {
          toast({ title: "Bet failed", description: String((error as any)?.error ?? "Unknown error"), variant: "destructive" });
        }
      }
    );
  };

  if (isLoading || !market || !user) {
    return (
      <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { settings, overPool, underPool, overPct, underPct, shotHistory, userBets } = market;
  const grandQuestion = `Will ${settings.trackedPersonName} drink ${settings.grandLine} shots of alcohol?`;

  const chartData = shotHistory.map(pt => ({
    date: new Date(pt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    shots: pt.cumulativeTotal
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <Badge variant={settings.grandStatus === "active" ? "default" : "outline"} className="uppercase font-bold px-3 py-1">
            {settings.grandStatus === "active" ? "ACTIVE MARKET" : "RESOLVED"}
          </Badge>
          <div className="text-sm font-mono text-muted-foreground">
            {formatDate(settings.grandStartDate)} - {formatDate(settings.grandEndDate)}
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-medium tracking-normal flex items-center gap-4">
          <Flame className="w-12 h-12 text-muted-foreground hidden md:block" />
          {grandQuestion}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-medium text-xl text-foreground">Shot History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                  />
                  <ReferenceLine y={settings.grandLine} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'LINE', fill: 'hsl(var(--primary))', fontSize: 12, fontWeight: 500 }} />
                  <Line type="monotone" dataKey="shots" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary bg-card">
            <CardContent className="pt-6 text-center">
              <div className="text-sm font-medium text-muted-foreground mb-2">Current Count</div>
              <div className="text-7xl font-medium leading-none text-foreground">{settings.cumulativeShots}</div>
              
              <div className="w-full h-px bg-border my-6" />
              
              <div className="text-sm font-medium text-muted-foreground mb-2">The Line</div>
              <div className="text-5xl font-medium leading-none text-muted-foreground">{settings.grandLine}</div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
            <CardContent className="pt-6">
              <ProgressBar overPct={overPct} underPct={underPct} className="mb-4" />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="text-center p-2 rounded bg-background/50">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Over Pool</div>
                  <div className="text-sm font-medium">{formatMoney(overPool)}</div>
                </div>
                <div className="text-center p-2 rounded bg-background/50">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Under Pool</div>
                  <div className="text-sm font-medium">{formatMoney(underPool)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {settings.grandStatus === "active" && (
        <BetForm 
          onPlaceBet={handlePlaceBet} 
          isPending={placeBetMutation.isPending} 
          marketName="Grand Market" 
          userBalance={user.balance} 
        />
      )}

      {settings.grandStatus === "resolved" && settings.grandWinningSide && (
        <div className="p-8 bg-card rounded-xl border-2 border-primary text-center">
          <h2 className="text-2xl font-medium text-muted-foreground mb-4">Final Verdict</h2>
          <div className="text-5xl font-medium text-foreground">
            {settings.grandWinningSide === "push" ? "PUSH" : `${settings.grandWinningSide} WINS THE GRAND MARKET`}
          </div>
        </div>
      )}

      {userBets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-medium">Your Grand Bets</h2>
          <div className="grid gap-3">
            {userBets.map(bet => (
              <Card key={bet.id} className="bg-card/40 border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant={bet.side === "over" ? "default" : "secondary"} className="uppercase font-bold">
                      {bet.side}
                    </Badge>
                    <span className="font-medium text-lg">{formatMoney(bet.stake)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
                    <div className={`font-medium ${
                      bet.status === "won" ? "text-primary" : 
                      bet.status === "lost" ? "text-destructive" : 
                      "text-foreground"
                    }`}>
                      {bet.status}
                      {bet.status === "won" && ` (+${formatMoney(bet.payout)})`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
