import { useParams } from "wouter";
import { useGetEvent, usePlaceBetOnEvent, useGetMe, getGetEventQueryKey, getGetMeQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/main";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ProgressBar";
import { BetForm } from "@/components/BetForm";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetail() {
  const params = useParams<{ eventId: string }>();
  const eventId = Number(params.eventId);
  const { toast } = useToast();

  const { data: user } = useGetMe();
  const { data: detail, isLoading } = useGetEvent(eventId, {
    query: {
      enabled: !!eventId && !isNaN(eventId),
      queryKey: getGetEventQueryKey(eventId)
    }
  });

  const placeBetMutation = usePlaceBetOnEvent();

  const handlePlaceBet = (side: "over" | "under", stake: number) => {
    placeBetMutation.mutate(
      { eventId, data: { side, stake } },
      {
        onSuccess: () => {
          toast({ title: "Bet placed successfully!", variant: "default" });
          queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (error) => {
          toast({ title: "Bet failed", description: String((error as any)?.error ?? "Unknown error"), variant: "destructive" });
        }
      }
    );
  };

  if (isLoading || !detail || !user) {
    return (
      <div className="space-y-8 animate-pulse max-w-3xl mx-auto">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const { event, overPct, underPct, userBets } = detail;

  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
  let statusText: string = event.status;

  if (event.status === "active") {
    badgeVariant = "default";
    statusText = "ACTIVE";
  } else if (event.status === "pending") {
    badgeVariant = "secondary";
    statusText = "PENDING RESOLUTION";
  } else if (event.status === "resolved") {
    badgeVariant = "outline";
    statusText = `RESOLVED`;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-2">
            <Badge variant={badgeVariant} className="uppercase font-bold px-3 py-1">{statusText}</Badge>
            <Badge variant={event.countsTowardGrand ? "secondary" : "outline"} className="uppercase font-bold px-3 py-1">
              {event.countsTowardGrand ? "Grand total" : "Side market"}
            </Badge>
          </div>
          <div className="text-sm font-mono text-muted-foreground">{formatDate(event.eventDate)}</div>
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-normal">{event.title}</h1>
      </div>

      <Card className="border-border bg-card/50">
        <CardContent className="pt-6">
          <div className="flex items-end gap-3 mb-6">
            <span className="text-6xl font-medium leading-none text-foreground">{event.line}</span>
            <span className="text-xl font-medium text-muted-foreground pb-1">Line</span>
          </div>
          <ProgressBar overPct={overPct} underPct={underPct} className="mb-4" />
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <div className="text-xs font-medium text-muted-foreground mb-1">Over Pool</div>
              <div className="text-xl font-medium">{formatMoney(detail.overPool)}</div>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <div className="text-xs font-medium text-muted-foreground mb-1">Under Pool</div>
              <div className="text-xl font-medium">{formatMoney(detail.underPool)}</div>
            </div>
          </div>

          {event.status === "resolved" && (
            <div className="mt-6 p-6 bg-muted/50 rounded-xl border border-border text-center">
              <h3 className="text-sm font-medium text-muted-foreground">Final Result</h3>
              <div className="text-5xl font-medium my-2">{event.actualShots} Shots</div>
              <div className="text-xl font-medium text-foreground">
                {event.winningSide === "push" ? "Push" : `${event.winningSide} Wins`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {event.status === "active" && (
        <BetForm 
          onPlaceBet={handlePlaceBet} 
          isPending={placeBetMutation.isPending} 
          marketName={event.title} 
          userBalance={user.balance} 
        />
      )}

      {userBets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-medium">Your Bets</h2>
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
