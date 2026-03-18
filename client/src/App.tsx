import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import { NavBar } from "./components/NavBar";
import { NightSkyBackground } from "./components/NightSkyBackground";

import { useUser } from "./hooks/use-auth";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import DashboardManager from "./pages/DashboardManager";
import CustomerPortal from "./pages/CustomerPortal";
import NotFound from "@/pages/not-found";

function AdminRoute() {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      setLocation("/login");
      return;
    }

    if (user.role !== "admin") {
      setLocation("/");
    }
  }, [isLoading, setLocation, user]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-5rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return <AdminDashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin" component={AdminRoute} />
      <Route path="/dashboard" component={DashboardManager} />
      <Route path="/portal" component={CustomerPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NightSkyBackground />
        <div className="relative z-10">
          <NavBar />
          <main>
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
