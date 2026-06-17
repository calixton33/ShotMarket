import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, useSetAdminMode, getGetMeQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy, Home, Settings, Flame, ShieldCheck, User } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function Shell({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe();
  const logout = useLogout();
  const setAdminMode = useSetAdminMode();
  const [location, setLocation] = useLocation();

  const navClass = (href: string) =>
    `px-3 py-5 text-sm font-medium text-foreground transition-colors border-b-2 ${
      location === href
        ? "border-primary"
        : "border-transparent hover:border-border hover:text-foreground"
    }`;

  const mobileNavClass = (href: string) =>
    `flex flex-col items-center gap-1 p-2 ${
      location === href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/login");
      }
    });
  };

  const handleModeToggle = (enabled: boolean) => {
    setAdminMode.mutate(
      { data: { enabled } },
      {
        onSuccess: (updatedUser) => {
          queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
          toast({
            title: enabled ? "Admin mode activated" : "Switched to bettor mode",
            description: enabled
              ? "You can now create events and manage markets."
              : "You are now in bettor mode.",
          });
        },
        onError: () => {
          toast({ title: "Failed to switch mode", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark">
      {/* Top Banner */}
      <div className="border-b border-border bg-background py-2 text-center text-xs font-medium text-muted-foreground">
        ShotCoins are fake points only and have no real-world value.
      </div>
      
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl border border-primary text-primary flex items-center justify-center font-medium">
              SM
            </div>
            <span className="font-medium text-xl tracking-normal">
              ShotMarket
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              {/* Desktop nav */}
              <div className="hidden sm:flex items-center gap-1">
                <Link href="/dashboard" className={navClass("/dashboard")}>
                  DASHBOARD
                </Link>
                <Link href="/grand" className={`${navClass("/grand")} flex items-center gap-1`}>
                  <Flame className="w-4 h-4" /> GRAND
                </Link>
                <Link href="/events" className={`${navClass("/events")} flex items-center gap-1`}>
                  <CalendarDays className="w-4 h-4" /> EVENTS
                </Link>
                <Link href="/leaderboard" className={`${navClass("/leaderboard")} flex items-center gap-1`}>
                  <Trophy className="w-4 h-4" /> RANKS
                </Link>
                {user.isAdmin && user.adminMode && (
                  <Link href="/admin" className={`${navClass("/admin")} flex items-center gap-1`}>
                    <ShieldCheck className="w-4 h-4" /> ADMIN
                  </Link>
                )}
              </div>

              {/* Admin mode toggle — only shown to admin users */}
              {user.isAdmin && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label htmlFor="admin-mode-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                    {user.adminMode ? "Admin" : "Bettor"}
                  </Label>
                  <Switch
                    id="admin-mode-toggle"
                    checked={user.adminMode}
                    onCheckedChange={handleModeToggle}
                    disabled={setAdminMode.isPending}
                    className="scale-75"
                  />
                  {user.adminMode && <ShieldCheck className="w-3.5 h-3.5 text-foreground" />}
                </div>
              )}

              <div className="bg-foreground px-4 py-1.5 rounded-full flex flex-col items-end border border-foreground text-background">
                <span className="text-[10px] font-medium text-background/60 leading-none">{user.username}</span>
                <span className="font-medium leading-tight">{formatMoney(user.balance)} SC</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                LOGOUT
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-10 sm:py-14">
        {children}
      </main>

      {/* Mobile Nav */}
      {user && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 flex justify-around items-center z-50">
          <Link href="/dashboard" className={mobileNavClass("/dashboard")}>
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/grand" className={mobileNavClass("/grand")}>
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-medium">Grand</span>
          </Link>
          <Link href="/events" className={mobileNavClass("/events")}>
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-medium">Events</span>
          </Link>
          <Link href="/leaderboard" className={mobileNavClass("/leaderboard")}>
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] font-medium">Ranks</span>
          </Link>
          {user.isAdmin && (
            <div className="flex flex-col items-center gap-1 p-2">
              <Switch
                checked={user.adminMode ?? false}
                onCheckedChange={handleModeToggle}
                disabled={setAdminMode.isPending}
                className="scale-75"
              />
              <span className="text-[10px] font-medium text-muted-foreground">
                {user.adminMode ? "Admin" : "Bettor"}
              </span>
            </div>
          )}
          {user.isAdmin && user.adminMode && (
            <Link href="/admin" className={mobileNavClass("/admin")}>
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
          {(!user.isAdmin || !user.adminMode) && (
            <div className="flex flex-col items-center gap-1 p-2 text-muted-foreground opacity-30">
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </div>
          )}
        </nav>
      )}
      {user && <div className="h-16 sm:hidden" />}
    </div>
  );
}
