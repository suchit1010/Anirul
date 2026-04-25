import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Gate } from "@/components/Gate";
import { AppShell } from "@/components/AppShell";
import { PatientsPage } from "@/pages/Patients";
import { PatientDetailPage } from "@/pages/PatientDetail";
import { getPasscode } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function NotFound() {
  return (
    <div className="text-center py-16">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">404</div>
      <h1 className="text-2xl font-serif mt-2">Page not found</h1>
      <p className="text-sm text-muted-foreground mt-1">
        The page you're looking for doesn't exist.
      </p>
    </div>
  );
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={PatientsPage} />
      <Route path="/patients/:id">
        {(params) => <PatientDetailPage id={params.id} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const code = getPasscode();
    if (!code) {
      setChecking(false);
      return;
    }
    fetch("/api/doctor/patients", { headers: { "X-Doctor-Passcode": code } })
      .then((r) => {
        if (r.ok) setUnlocked(true);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="min-h-screen" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        {unlocked ? (
          <AppShell onLock={() => setUnlocked(false)}>
            <Routes />
          </AppShell>
        ) : (
          <Gate onUnlocked={() => setUnlocked(true)} />
        )}
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
