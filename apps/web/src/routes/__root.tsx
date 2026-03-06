import { trpc } from "@nobet/api-client";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BetSlip } from "../components/betting/bet-slip";
import { BottomNav } from "../components/betting/bottom-nav";
import { SportsSidebar } from "../components/betting/sports-sidebar";
import { ErrorBoundary } from "../components/error-boundary";
import { Footer, Header } from "../components/layout";
import { Sheet, SheetContent } from "../components/ui/sheet";
import { ActiveSportProvider, useActiveSport } from "../context/active-sport-context";
import { AuthProvider } from "../context/auth-context";
import { BetSlipProvider, useBetSlip } from "../context/bet-slip-context";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeSport, setActiveSport } = useActiveSport();
  const { isOpen: betSlipOpen, setIsOpen: setBetSlipOpen } = useBetSlip();
  const { data: sports = [] } = trpc.odds.listSports.useQuery();

  return (
    <div className="flex min-h-screen flex-col bg-[#121212]">
      <Header onMenuToggle={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-52 shrink-0 overflow-y-auto lg:block">
          <SportsSidebar
            sports={sports}
            activeSport={activeSport}
            onSportSelect={setActiveSport}
            className="min-h-full"
          />
        </aside>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>

        <aside className="hidden w-72 shrink-0 border-l border-[#2a2a2a] overflow-y-auto lg:block">
          <BetSlip className="min-h-full" />
        </aside>
      </div>

      <Footer />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 border-r border-[#2d4a2d] bg-[#1a2e1a] p-0">
          <SportsSidebar
            sports={sports}
            activeSport={activeSport}
            onSportSelect={(id) => {
              setActiveSport(id);
              setSidebarOpen(false);
            }}
            className="h-full"
          />
        </SheetContent>
      </Sheet>

      <Sheet open={betSlipOpen} onOpenChange={setBetSlipOpen}>
        <SheetContent side="bottom" className="h-[85vh] border-t border-[#2a2a2a] bg-[#1e1e1e] p-0">
          <BetSlip onClose={() => setBetSlipOpen(false)} />
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <AuthProvider>
        <BetSlipProvider>
          <ActiveSportProvider>
            <AppLayout />
          </ActiveSportProvider>
        </BetSlipProvider>
      </AuthProvider>
    </ErrorBoundary>
  ),
});
