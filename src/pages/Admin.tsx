import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminLogin,
  useClearEvents,
  useUpdateSettings,
  useCreateEvent,
  useDeleteEvent,
  useGetSettings,
  useGiveUserMoney,
  useListEvents,
  useResolveEvent,
  useResolveGrandMarket,
  useListUsers,
  usePromoteUser,
  useGetMe,
  useResetPlayersAndPools,
  useResetPoolsAndBalances,
  getGetSettingsQueryKey,
  getGetMeQueryKey,
  getListEventsQueryKey,
  getListUsersQueryKey,
  getGetDashboardQueryKey,
  getGetLeaderboardQueryKey,
  getGetGrandMarketQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, DollarSign, Eraser, Lock, RotateCcw, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const authSchema = z.object({ password: z.string().min(1, "Password required") });
const settingsSchema = z.object({
  grandMarketTitle: z.string().min(1),
  trackedPersonName: z.string().min(1),
  grandLine: z.coerce.number().min(0.5),
  grandStartDate: z.string().min(1),
  grandEndDate: z.string().min(1)
});
const eventSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().min(1),
  line: z.coerce.number().min(0.5),
  countsTowardGrand: z.boolean()
});
const resolveSchema = z.object({ actualShots: z.coerce.number().min(0) });

function getWinnerLabel(winningSide: "over" | "under" | "push" | undefined) {
  if (!winningSide) return "";
  if (winningSide === "push") return "Push";
  return `${winningSide.toUpperCase()} wins`;
}

export default function Admin() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuth] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [giveAmounts, setGiveAmounts] = useState<Record<string, string>>({});

  const { data: me } = useGetMe();
  const adminLogin = useAdminLogin();
  const updateSettings = useUpdateSettings();
  const createEvent = useCreateEvent();
  const resolveEvent = useResolveEvent();
  const deleteEvent = useDeleteEvent();
  const clearEvents = useClearEvents();
  const resolveGrand = useResolveGrandMarket();
  const promoteUser = usePromoteUser();
  const giveUserMoney = useGiveUserMoney();
  const resetPlayersAndPools = useResetPlayersAndPools();
  const resetPoolsAndBalances = useResetPoolsAndBalances();

  // Auto-authenticate if the user is a DB admin with admin mode active
  const isDbAdminInAdminMode = me?.isAdmin && me?.adminMode;

  const effectivelyAuth = isAuthenticated || !!isDbAdminInAdminMode;

  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey(), enabled: effectivelyAuth } });
  const { data: events } = useListEvents({ query: { queryKey: getListEventsQueryKey(), enabled: effectivelyAuth } });
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey(), enabled: effectivelyAuth } });

  const authForm = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { password: "" }
  });

  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      grandMarketTitle: "",
      trackedPersonName: "",
      grandLine: 100,
      grandStartDate: "",
      grandEndDate: ""
    }
  });

  const eventForm = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", eventDate: "", line: 10.5, countsTowardGrand: true }
  });

  const resolveForm = useForm<z.infer<typeof resolveSchema>>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { actualShots: 0 }
  });

  useEffect(() => {
    if (settings) {
      settingsForm.reset({
        grandMarketTitle: settings.grandMarketTitle,
        trackedPersonName: settings.trackedPersonName,
        grandLine: settings.grandLine,
        grandStartDate: settings.grandStartDate.split('T')[0],
        grandEndDate: settings.grandEndDate.split('T')[0]
      });
    }
  }, [settings, settingsForm]);

  const onAuth = (data: z.infer<typeof authSchema>) => {
    adminLogin.mutate(
      { data: { password: data.password } },
      {
        onSuccess: () => {
          setIsAuth(true);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Authenticated as Admin" });
        },
        onError: () => {
          toast({ title: "Admin access denied", variant: "destructive" });
        }
      }
    );
  };

  const onUpdateSettings = (data: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Settings updated" });
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetGrandMarketQueryKey() });
        }
      }
    );
  };

  const onCreateEvent = (data: z.infer<typeof eventSchema>) => {
    createEvent.mutate(
      { data: { ...data, eventDate: new Date(data.eventDate).toISOString() } },
      {
        onSuccess: () => {
          toast({ title: "Event created" });
          eventForm.reset();
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetGrandMarketQueryKey() });
        }
      }
    );
  };

  const onResolveEvent = (data: z.infer<typeof resolveSchema>) => {
    if (!resolvingId) return;
    resolveEvent.mutate(
      { eventId: resolvingId, data },
      {
        onSuccess: () => {
          toast({ title: "Event resolved", description: "Payouts have been distributed." });
          setResolvingId(null);
          resolveForm.reset();
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetGrandMarketQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        }
      }
    );
  };

  const onDeleteEvent = (eventId: number, title: string) => {
    if (!confirm(`Delete "${title}"? Open bets on this event will be refunded.`)) return;

    deleteEvent.mutate(
      { eventId },
      {
        onSuccess: () => {
          toast({ title: "Event deleted", description: "Open bets were refunded." });
          if (resolvingId === eventId) {
            setResolvingId(null);
            resolveForm.reset();
          }
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetGrandMarketQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to delete event", variant: "destructive" });
        }
      }
    );
  };

  const refreshEventViews = () => {
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetGrandMarketQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  const onClearDashboard = () => {
    if (!events?.length) return;
    if (!confirm("Clear the dashboard by deleting all session events? Open event bets will be refunded.")) return;

    clearEvents.mutate(undefined, {
      onSuccess: (deletedEvents) => {
        toast({
          title: "Dashboard cleared",
          description: `${deletedEvents.length} event${deletedEvents.length === 1 ? "" : "s"} deleted.`,
        });
        setResolvingId(null);
        resolveForm.reset();
        refreshEventViews();
      },
      onError: () => {
        toast({ title: "Failed to clear dashboard", variant: "destructive" });
      }
    });
  };

  const onResolveGrand = () => {
    if (!confirm("Are you sure you want to resolve the grand market? This cannot be undone.")) return;
    resolveGrand.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Grand market resolved" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGrandMarketQueryKey() });
      }
    });
  };

  const onToggleAdmin = (userId: string, currentIsAdmin: boolean) => {
    promoteUser.mutate(
      { userId, data: { isAdmin: !currentIsAdmin } },
      {
        onSuccess: (user) => {
          toast({
            title: user.isAdmin ? `${user.username} promoted to admin` : `${user.username} demoted to bettor`,
          });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update user", variant: "destructive" });
        }
      }
    );
  };

  const onResetPlayersAndPools = () => {
    if (!confirm("Reset leaderboard, users, all bets, and total pools? This keeps your admin account and removes everyone else.")) return;

    resetPlayersAndPools.mutate(undefined, {
      onSuccess: ({ user }) => {
        toast({
          title: "Leaderboard and pools reset",
          description: "Only your admin account remains.",
        });
        setGiveAmounts({});
        setResolvingId(null);
        resolveForm.reset();
        queryClient.setQueryData(getGetMeQueryKey(), user);
        refreshEventViews();
      },
      onError: () => {
        toast({ title: "Failed to reset leaderboard", variant: "destructive" });
      }
    });
  };

  const onResetPoolsAndBalances = () => {
    if (!confirm("Reset every player's balance to 100 SC and clear all betting pools? All player accounts will stay.")) return;

    resetPoolsAndBalances.mutate(undefined, {
      onSuccess: ({ user }) => {
        toast({
          title: "Pools and balances reset",
          description: "All players remain, each with 100 SC.",
        });
        setGiveAmounts({});
        queryClient.setQueryData(getGetMeQueryKey(), user);
        refreshEventViews();
      },
      onError: () => {
        toast({ title: "Failed to reset pools and balances", variant: "destructive" });
      }
    });
  };

  const onGiveMoney = (userId: string, username: string) => {
    const amount = Number(giveAmounts[userId]);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter an amount greater than zero", variant: "destructive" });
      return;
    }

    giveUserMoney.mutate(
      { userId, data: { amount } },
      {
        onSuccess: () => {
          toast({ title: `${formatMoney(amount)} SC added to ${username}` });
          setGiveAmounts((current) => ({ ...current, [userId]: "" }));
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to give money", variant: "destructive" });
        }
      }
    );
  };

  if (me && !me.isAdmin) {
    return (
      <div className="max-w-md mx-auto pt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This area is only available to admin accounts.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!effectivelyAuth) {
    return (
      <div className="max-w-md mx-auto pt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {me?.isAdmin && !me?.adminMode && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary font-medium">
                You are an admin — toggle Admin Mode on in the header to skip this screen.
              </div>
            )}
            <Form {...authForm}>
              <form onSubmit={authForm.handleSubmit(onAuth)} className="space-y-4">
                <FormField control={authForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Admin password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={adminLogin.isPending}>
                  {adminLogin.isPending ? "Logging in…" : "Login"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-medium">Admin Dashboard</h1>
        {isDbAdminInAdminMode && (
          <Badge className="bg-primary/20 text-primary border-primary/30 font-bold uppercase">
            <ShieldCheck className="w-3 h-3 mr-1" /> Admin Mode
          </Badge>
        )}
      </div>

      <Tabs defaultValue="events">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Session Events</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Global Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="events" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle>Create New Session Event</CardTitle></CardHeader>
            <CardContent>
              <Form {...eventForm}>
                <form onSubmit={eventForm.handleSubmit(onCreateEvent)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField control={eventForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="e.g. Pre-game at John's" /></FormControl></FormItem>
                    )} />
                    <FormField control={eventForm.control} name="eventDate" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={eventForm.control} name="line" render={({ field }) => (
                      <FormItem><FormLabel>O/U Line</FormLabel><FormControl><Input type="number" step="0.5" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={eventForm.control} name="countsTowardGrand" render={({ field }) => (
                      <FormItem className="flex min-h-16 flex-row items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                        <FormLabel className="text-sm font-medium">Counts to Grand</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={createEvent.isPending}>Create Event</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Manage Events</CardTitle>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onClearDashboard}
                  disabled={!events?.length || clearEvents.isPending}
                  className="gap-1"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Clear Dashboard
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events?.map(event => (
                  <div key={event.id} className="p-4 border rounded-lg bg-card/50">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-bold">{event.title}</div>
                          <Badge variant={event.status === "resolved" ? "outline" : event.status === "pending" ? "secondary" : "default"} className="uppercase">
                            {event.status}
                          </Badge>
                          <Badge variant={event.countsTowardGrand ? "secondary" : "outline"} className="uppercase">
                            {event.countsTowardGrand ? "Grand total" : "Side market"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(event.eventDate)} • Line: {event.line}
                        </div>
                        {event.status === "resolved" && (
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span className="font-bold">Final result:</span>
                            <span>{event.actualShots} shots</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="uppercase font-black text-primary">{getWinnerLabel(event.winningSide)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {event.status !== "resolved" && resolvingId === event.id && (
                          <Form {...resolveForm}>
                            <form onSubmit={resolveForm.handleSubmit(onResolveEvent)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                              <FormField control={resolveForm.control} name="actualShots" render={({ field }) => (
                                <FormItem className="mb-0 space-y-1">
                                  <FormLabel className="text-xs uppercase">Final shots</FormLabel>
                                  <FormControl><Input type="number" className="w-full sm:w-28" placeholder="Shots" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <Button type="submit" size="sm" disabled={resolveEvent.isPending}>Save Result</Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setResolvingId(null)}>Cancel</Button>
                            </form>
                          </Form>
                        )}
                        {event.status !== "resolved" && resolvingId !== event.id && (
                          <Button onClick={() => setResolvingId(event.id)} size="sm">Resolve</Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteEvent(event.id, event.title)}
                          disabled={deleteEvent.isPending}
                          className="gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!events?.length && (
                  <div className="text-muted-foreground text-sm">No events yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onResetPoolsAndBalances}
                    disabled={resetPoolsAndBalances.isPending}
                    className="gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Balances & Pools
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={onResetPlayersAndPools}
                    disabled={resetPlayersAndPools.isPending}
                    className="gap-1"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    Delete Players & Pools
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users?.map(user => (
                  <div key={user.id} className="p-4 border rounded-lg flex flex-col gap-4 bg-card/50 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{user.username}</span>
                        {user.isAdmin && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                          </Badge>
                        )}
                        {user.id === me?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{formatMoney(user.balance)} SC balance</div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={giveAmounts[user.id] ?? ""}
                          onChange={(event) => {
                            setGiveAmounts((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }));
                          }}
                          placeholder="SC"
                          className="w-full sm:w-28"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onGiveMoney(user.id, user.username)}
                          disabled={giveUserMoney.isPending}
                          className="gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Give
                        </Button>
                      </div>
                      <Button
                        variant={user.isAdmin ? "outline" : "secondary"}
                        size="sm"
                        disabled={user.id === me?.id || promoteUser.isPending}
                        onClick={() => onToggleAdmin(user.id, user.isAdmin)}
                        className="gap-1"
                      >
                        {user.isAdmin ? (
                          <><ShieldOff className="w-3.5 h-3.5" /> Revoke Admin</>
                        ) : (
                          <><ShieldCheck className="w-3.5 h-3.5" /> Make Admin</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {!users?.length && (
                  <div className="text-muted-foreground text-sm">No users yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle>Market Settings</CardTitle></CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onUpdateSettings)} className="space-y-4">
                  <FormField control={settingsForm.control} name="grandMarketTitle" render={({ field }) => (
                    <FormItem><FormLabel>Grand Market Question</FormLabel><FormControl><Input {...field} placeholder="Will Jia Xuan drink 100 shots of alcohol?" /></FormControl></FormItem>
                  )} />
                  <FormField control={settingsForm.control} name="trackedPersonName" render={({ field }) => (
                    <FormItem><FormLabel>Tracked Person Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={settingsForm.control} name="grandLine" render={({ field }) => (
                    <FormItem><FormLabel>Grand Total Line</FormLabel><FormControl><Input type="number" step="0.5" {...field} /></FormControl></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={settingsForm.control} name="grandStartDate" render={({ field }) => (
                      <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={settingsForm.control} name="grandEndDate" render={({ field }) => (
                      <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={updateSettings.isPending}>Save Settings</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">Resolve Grand Market</div>
                  <div className="text-sm text-muted-foreground">Ends the season and resolves all grand bets.</div>
                </div>
                <Button variant="destructive" onClick={onResolveGrand} disabled={resolveGrand.isPending || settings?.grandStatus === 'resolved'}>
                  {settings?.grandStatus === 'resolved' ? 'Already Resolved' : 'Resolve Grand Market'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
