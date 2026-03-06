import { trpc } from "@nobet/api-client";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Radio, TrendingUp } from "lucide-react";
import { FeaturedBanner } from "../components/betting/featured-banner";
import { MatchCard } from "../components/betting/match-card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useActiveSport } from "../context/active-sport-context";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function SectionHeader({
  icon,
  title,
  count,
  accentColor = "text-white",
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  accentColor?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#252525] px-3 py-2.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm font-bold ${accentColor}`}>{title}</span>
        {count !== undefined && (
          <Badge className="h-4 rounded bg-[#3a3a3a] px-1.5 text-[9px] font-bold text-[#a0a0a0] border-0">
            {count}
          </Badge>
        )}
      </div>
      <button
        type="button"
        className="flex items-center gap-0.5 text-[11px] text-[#7090b0] transition-colors hover:text-white"
      >
        View all
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function IndexComponent() {
  const { activeSport } = useActiveSport();
  const featuredQuery = trpc.odds.getFeatured.useQuery();
  const eventsQuery = trpc.odds.listEvents.useQuery(
    { sportKey: activeSport },
    {
      enabled:
        !!activeSport &&
        activeSport !== "featured" &&
        activeSport !== "live" &&
        activeSport !== "popular" &&
        activeSport !== "competitions",
    }
  );

  const featuredMatches = featuredQuery.data ?? [];
  const eventMatches = eventsQuery.data ?? [];
  const liveCount = 0; // Odds API doesn't provide live events in same way; can be extended later

  return (
    <div className="space-y-0">
      <div className="px-3 pt-3 pb-2 sm:px-4">
        {featuredQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center rounded-lg bg-[#1e1e1e] text-[#7090b0]">
            Loading featured…
          </div>
        ) : featuredMatches.length > 0 ? (
          <FeaturedBanner matches={featuredMatches} />
        ) : featuredQuery.isError ? (
          <div className="rounded-lg bg-red-900/20 p-4 text-sm text-red-300">
            Failed to load featured events. Check ODDS_API_KEY in .env
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="sticky top-0 z-10 bg-[#1a1a1a] border-b border-[#2a2a2a]">
          <TabsList className="flex h-10 w-full justify-start gap-0 rounded-none bg-transparent px-3 sm:px-4">
            {[
              { value: "all", label: "All" },
              { value: "live", label: "Live", badge: liveCount },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative h-full rounded-none border-b-2 border-transparent bg-transparent px-3 text-xs font-medium text-[#7090b0] data-[state=active]:border-yellow-400 data-[state=active]:bg-transparent data-[state=active]:text-yellow-400 data-[state=active]:shadow-none"
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1.5 rounded bg-green-600 px-1 py-0.5 text-[9px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0 space-y-0">
          <div className="space-y-0">
            <SectionHeader
              icon={<TrendingUp className="h-4 w-4 text-blue-400" />}
              title="Upcoming"
              count={eventMatches.length}
              accentColor="text-blue-300"
            />
            {eventsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-[#7090b0]">
                Loading events…
              </div>
            ) : eventsQuery.isError ? (
              <div className="px-3 py-6 text-center text-sm text-red-400">
                Failed to load events. Try another sport from the sidebar.
              </div>
            ) : eventMatches.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[#7090b0]">
                No upcoming events for this sport.
              </div>
            ) : (
              eventMatches.map((match) => <MatchCard key={match.id} match={match} />)
            )}
          </div>
          <div className="h-4" />
        </TabsContent>

        <TabsContent value="live" className="mt-0">
          <div className="rounded-none border-0">
            <SectionHeader
              icon={<Radio className="h-4 w-4 animate-live-pulse text-green-500" />}
              title="Live Now"
              count={liveCount}
              accentColor="text-green-400"
            />
            {liveCount === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[#7090b0]">
                No live events right now.
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
