import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider, useSession } from "./lib/session";
import { LangProvider } from "./lib/lang";
import { Layout } from "./components/layout";
import Login from "./pages/login";
import Chat from "./pages/chat";
import Settings from "./pages/settings";
import DoubleBottom from "./pages/settings/double-bottom";
import Panic from "./pages/settings/panic";
import Cybersecurity from "./pages/settings/cybersecurity";
import Profile from "./pages/profile";
import Admin from "./pages/admin";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function Guard({ component: Component }: { component: React.ComponentType }) {
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
        <Layout><Guard component={Chat} /></Layout>
      </Route>
      <Route path="/settings">
        <Layout><Guard component={Settings} /></Layout>
      </Route>
      <Route path="/settings/double-bottom">
        <Layout><Guard component={DoubleBottom} /></Layout>
      </Route>
      <Route path="/settings/panic">
        <Layout><Guard component={Panic} /></Layout>
      </Route>
      <Route path="/settings/cybersecurity">
        <Layout><Guard component={Cybersecurity} /></Layout>
      </Route>
      <Route path="/profile">
        <Layout><Guard component={Profile} /></Layout>
      </Route>
      <Route path="/admin">
        <Layout><Guard component={Admin} /></Layout>
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
            <LangProvider>
              <Router />
            </LangProvider>
          </SessionProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
