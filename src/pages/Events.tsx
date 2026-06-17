import { useMemo } from "react";
import { useListEvents } from "@workspace/api-client-react";
import { MarketCard } from "@/components/MarketCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function EventGrid({ events, emptyText }: { events: ReturnType<typeof useListEvents>["data"]; emptyText: string }) {
  if (!events?.length) {
    return (
      <div className="text-center py-20 bg-card/30 rounded-xl border border-border border-dashed">
        <h3 className="text-sm font-medium text-muted-foreground">{emptyText}</h3>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <MarketCard key={event.id} event={event} overPct={50} underPct={50} />
      ))}
    </div>
  );
}

export default function Events() {
  const { data: events, isLoading } = useListEvents();

  const { upcomingEvents, pastEvents, allEvents } = useMemo(() => {
    const today = startOfToday();
    const all = events ?? [];

    return {
      upcomingEvents: all
        .filter((event) => event.status !== "resolved" && new Date(event.eventDate) >= today)
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
      pastEvents: all
        .filter((event) => event.status === "resolved" || new Date(event.eventDate) < today)
        .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
      allEvents: [...all].sort(
        (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
      ),
    };
  }, [events]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-8 h-8 text-muted-foreground" />
        <h1 className="text-4xl font-medium tracking-normal">Events</h1>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <EventGrid events={upcomingEvents} emptyText="No upcoming events" />
        </TabsContent>
        <TabsContent value="past">
          <EventGrid events={pastEvents} emptyText="No past events" />
        </TabsContent>
        <TabsContent value="all">
          <EventGrid events={allEvents} emptyText="No events yet" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
