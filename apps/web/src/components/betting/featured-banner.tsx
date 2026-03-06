import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";
import type { Match } from "../../types/betting";
import { OddsButton } from "./odds-button";

interface FeaturedBannerProps {
  matches: Match[];
  className?: string;
}

const SPORT_COLORS: Record<string, string> = {
  soccer_epl: "from-green-900/60 to-[#1e1e1e]",
  soccer_spain_la_liga: "from-green-900/60 to-[#1e1e1e]",
  soccer_uefa_champs_league: "from-green-900/60 to-[#1e1e1e]",
  basketball_nba: "from-orange-900/60 to-[#1e1e1e]",
  basketball_ncaab: "from-orange-900/60 to-[#1e1e1e]",
  tennis_atp_indian_wells: "from-yellow-900/60 to-[#1e1e1e]",
  tennis_wta_indian_wells: "from-yellow-900/60 to-[#1e1e1e]",
  americanfootball_nfl: "from-blue-900/60 to-[#1e1e1e]",
  americanfootball_ncaaf: "from-blue-900/60 to-[#1e1e1e]",
};

const SPORT_EMOJI: Record<string, string> = {
  soccer_epl: "⚽",
  soccer_spain_la_liga: "⚽",
  soccer_uefa_champs_league: "⚽",
  basketball_nba: "🏀",
  basketball_ncaab: "🏀",
  tennis_atp_indian_wells: "🎾",
  tennis_wta_indian_wells: "🎾",
  americanfootball_nfl: "🏈",
  americanfootball_ncaaf: "🏈",
};

export function FeaturedBanner({ matches, className }: FeaturedBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const match = matches[currentIndex];

  if (!match) return null;

  const hasThreeWay = match.odds.draw !== undefined;
  const matchName = `${match.homeTeam.name} v ${match.awayTeam.name}`;
  const gradientClass =
    SPORT_COLORS[match.sport] ??
    (match.sport.startsWith("soccer")
      ? "from-green-900/60 to-[#1e1e1e]"
      : match.sport.startsWith("basketball")
        ? "from-orange-900/60 to-[#1e1e1e]"
        : "from-slate-900/60 to-[#1e1e1e]");
  const emoji =
    SPORT_EMOJI[match.sport] ??
    (match.sport.startsWith("soccer")
      ? "⚽"
      : match.sport.startsWith("basketball")
        ? "🏀"
        : match.sport.startsWith("tennis")
          ? "🎾"
          : "🏆");

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <div className={cn("bg-gradient-to-r p-4 sm:p-6", gradientClass, "bg-[#1a2a3a]")}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#7090b0]">
                Featured
              </div>
              <div className="text-xs font-semibold text-[#a0b8d0]">{match.league}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {matches.map((match, i) => (
              <button
                key={match.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentIndex ? "w-5 bg-yellow-400" : "w-1.5 bg-white/30"
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-[#a0b8d0]">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{match.startTime}</span>
            </div>
            <div className="space-y-1">
              <div className="text-base font-bold text-white sm:text-lg">{match.homeTeam.name}</div>
              <div className="text-xs font-medium text-[#7090b0]">vs</div>
              <div className="text-base font-bold text-white sm:text-lg">{match.awayTeam.name}</div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-[10px] text-[#7090b0]">Match Result</span>
            <div className="flex gap-1.5">
              {hasThreeWay ? (
                <>
                  <OddsButton
                    label="1"
                    odds={match.odds.home}
                    matchId={match.id}
                    matchName={matchName}
                    market="1X2"
                    selection="Home"
                  />
                  <OddsButton
                    label="X"
                    odds={match.odds.draw!}
                    matchId={match.id}
                    matchName={matchName}
                    market="1X2"
                    selection="Draw"
                  />
                  <OddsButton
                    label="2"
                    odds={match.odds.away}
                    matchId={match.id}
                    matchName={matchName}
                    market="1X2"
                    selection="Away"
                  />
                </>
              ) : (
                <>
                  <OddsButton
                    label="1"
                    odds={match.odds.home}
                    matchId={match.id}
                    matchName={matchName}
                    market="ML"
                    selection="Home"
                  />
                  <OddsButton
                    label="2"
                    odds={match.odds.away}
                    matchId={match.id}
                    matchName={matchName}
                    market="ML"
                    selection="Away"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {matches.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => (i - 1 + matches.length) % matches.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1 text-white transition-colors hover:bg-black/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => (i + 1) % matches.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1 text-white transition-colors hover:bg-black/50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
