import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  CalendarDays,
  ChevronDown,
  Flame,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  useGetMe,
  useLogout,
  useSetAdminMode,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { formatMoney } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

interface ShellProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  show?: boolean;
}

export function Shell({ children }: ShellProps) {
  const { data: user } = useGetMe();
  const logout = useLogout();
  const setAdminMode = useSetAdminMode();
  const [location, setLocation] = useLocation();

  const isRouteActive = (href: string) =>
    location === href || (href === "/events" && location.startsWith("/event/"));

  const navLinkClass = (href: string) =>
    `inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isRouteActive(href)
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const mobileNavClass = (href: string) =>
    `flex min-w-14 flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isRouteActive(href)
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/login");
      },
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
        },
      },
    );
  };

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      mobileLabel: "Home",
      icon: Home,
    },
    {
      href: "/grand",
      label: "Grand",
      mobileLabel: "Grand",
      icon: Flame,
    },
    {
      href: "/events",
      label: "Events",
      mobileLabel: "Events",
      icon: CalendarDays,
    },
    {
      href: "/leaderboard",
      label: "Ranks",
      mobileLabel: "Ranks",
      icon: Trophy,
    },
    {
      href: "/admin",
      label: "Admin",
      mobileLabel: "Admin",
      icon: ShieldCheck,
      show: !!user?.isAdmin && !!user?.adminMode,
    },
  ].filter((item) => item.show !== false);

  const userInitials = user?.username.slice(0, 2).toUpperCase() ?? "SM";

  return (
    <div className="dark flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="border-b border-border bg-background py-2 text-center text-xs font-medium text-muted-foreground">
        ShotCoins are fake points only and have no real-world value.
      </div>

      <header className="border-b border-border bg-background/95">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="ShotMarket dashboard"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary bg-primary/10 text-sm font-semibold text-primary">
              SM
            </div>
            <span className="text-xl font-semibold tracking-normal">
              ShotMarket
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              <NavigationMenu className="hidden md:flex">
                <NavigationMenuList className="gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavigationMenuItem key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link href={item.href} className={navLinkClass(item.href)}>
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {item.label}
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>

              {user.isAdmin && (
                <div
                  className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 md:flex"
                  role="group"
                  aria-label="Admin mode"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <Label
                    htmlFor="admin-mode-toggle"
                    className="cursor-pointer select-none text-xs font-medium text-muted-foreground"
                  >
                    {user.adminMode ? "Admin" : "Bettor"}
                  </Label>
                  <Switch
                    id="admin-mode-toggle"
                    checked={user.adminMode}
                    onCheckedChange={handleModeToggle}
                    disabled={setAdminMode.isPending}
                    aria-label="Toggle admin mode"
                  />
                  {user.adminMode && (
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  )}
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 rounded-full px-2 pr-3"
                    aria-label="Open account menu"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden flex-col items-start leading-none lg:flex">
                      <span className="text-xs text-muted-foreground">
                        {user.username}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatMoney(user.balance)} SC
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {user.username}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                          {formatMoney(user.balance)} SC
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          Admin dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden md:inline-flex"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-6xl flex-1 px-4 py-10 sm:py-14">
        {children}
      </main>

      {user && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-card p-2 md:hidden"
          aria-label="Primary navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={mobileNavClass(item.href)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}

          {user.isAdmin && !user.adminMode && (
            <div className="flex min-w-14 flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium text-muted-foreground">
              <Switch
                checked={user.adminMode ?? false}
                onCheckedChange={handleModeToggle}
                disabled={setAdminMode.isPending}
                aria-label="Toggle admin mode"
              />
              <span>Bettor</span>
            </div>
          )}

          {(!user.isAdmin || !user.adminMode) && (
            <div
              className="flex min-w-14 flex-col items-center gap-1 rounded-xl p-2 text-xs font-medium text-muted-foreground opacity-40"
              aria-hidden="true"
            >
              <Settings className="h-5 w-5" />
              <span>Admin</span>
            </div>
          )}
        </nav>
      )}
      {user && <div className="h-16 md:hidden" />}
    </div>
  );
}
