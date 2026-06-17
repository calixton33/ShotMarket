import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Event } from "@workspace/api-client-react";

interface MarketCardProps {
  event: Event;
  overPct?: number;
  underPct?: number;
}

export function MarketCard({ event, overPct = 50, underPct = 50 }: MarketCardProps) {
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
    statusText = `RESOLVED: ${event.actualShots} SHOTS`;
  }

  return (
    <Link href={`/event/${event.id}`}>
      <Card className="hover-elevate border-border hover:border-primary transition-colors cursor-pointer h-full flex flex-col bg-card">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="text-lg leading-tight font-medium">{event.title}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">{formatDate(event.eventDate)}</div>
            </div>
            <Badge variant={badgeVariant} className="uppercase font-bold shrink-0">{statusText}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-end gap-2 mb-4">
            <span className="text-3xl font-medium leading-none">{event.line}</span>
            <span className="text-sm font-medium text-muted-foreground pb-1">Line</span>
          </div>
          {event.status === 'active' && (
            <ProgressBar overPct={overPct} underPct={underPct} />
          )}
          {event.status === 'resolved' && event.winningSide && (
            <div className="mt-4 p-3 bg-muted rounded-md text-center">
              <span className="font-medium text-sm text-muted-foreground">Winner</span>
              <div className="text-xl font-medium mt-1 text-foreground">
                {event.winningSide === 'push' ? 'PUSH' : `${event.winningSide} WINS`}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button variant="secondary" className="w-full font-medium" asChild>
            <div>{event.status === 'active' ? 'Place Bet' : 'View Details'}</div>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
