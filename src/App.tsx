import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Leaderboard from "@/pages/Leaderboard";
import Events from "@/pages/Events";
import GrandMarket from "@/pages/GrandMarket";
import EventDetail from "@/pages/EventDetail";
import Admin from "@/pages/Admin";
import { queryClient } from "@/lib/query-client";

function AuthRoute({ component: Component, ...rest }: any) {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;

  return <Component {...rest} />;
}

function RootRedirect() {
  const { data: user, isLoading } = useGetMe();
  
  if (isLoading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <Redirect to="/login" />;
}

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={RootRedirect} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard"><AuthRoute component={Dashboard} /></Route>
        <Route path="/events"><AuthRoute component={Events} /></Route>
        <Route path="/leaderboard"><AuthRoute component={Leaderboard} /></Route>
        <Route path="/grand"><AuthRoute component={GrandMarket} /></Route>
        <Route path="/event/:eventId"><AuthRoute component={EventDetail} /></Route>
        <Route path="/admin"><AuthRoute component={Admin} /></Route>
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
