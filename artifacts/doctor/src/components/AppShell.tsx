import { Activity, LogOut } from "lucide-react";
import { Link } from "wouter";

import { setPasscode } from "@/lib/api";

interface AppShellProps {
  children: React.ReactNode;
  onLock: () => void;
}

export function AppShell({ children, onLock }: AppShellProps) {
  const handleLock = () => {
    setPasscode("");
    onLock();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                SwasthAI
              </div>
              <div className="text-base font-serif leading-tight">Doctor Console</div>
            </div>
          </Link>
          <button
            onClick={handleLock}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Lock
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
      <footer className="border-t py-4 text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-6 flex justify-between">
          <span>SwasthAI · End-to-end private</span>
          <span>Patient-held longitudinal health memory</span>
        </div>
      </footer>
    </div>
  );
}
