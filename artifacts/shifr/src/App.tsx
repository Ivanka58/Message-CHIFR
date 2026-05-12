import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider, useSession } from "./lib/session";
import { Layout } from "./components/layout";
import Login from "./pages/login";
import Chat from "./pages/chat";
import Settings from "./pages/settings";
import Admin from "./pages/admin";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { session } = useSession();
  if (!session) {
    window.location.href = "/";
    return null;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/chat">
        <Layout>
          <ProtectedRoute component={Chat} />
        </Layout>
      </Route>
      <Route path="/settings">
        <Layout>
          <ProtectedRoute component={Settings} />
        </Layout>
      </Route>
      <Route path="/admin">
        <Layout>
          <ProtectedRoute component={Admin} />
        </Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <SessionProvider>
            <Router />
          </SessionProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
