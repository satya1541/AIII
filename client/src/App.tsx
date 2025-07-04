import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorBoundary from "@/components/error-boundary";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthWrapper from "@/components/AuthWrapper";
import Dashboard from "@/pages/dashboard";
import Connections from "@/pages/connections";
import Topics from "@/pages/topics";
import Messages from "@/pages/messages";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Publisher from "@/pages/publisher";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/connections" component={Connections} />
        <Route path="/topics" component={Topics} />
        <Route path="/messages" component={Messages} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/publisher" component={Publisher} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <AuthWrapper>
                <Router />
              </AuthWrapper>
            </AuthProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;