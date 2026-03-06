import { db } from "@nobet/db";
import { events, odds, sports } from "@nobet/db";
import type { EventMatch, Sport } from "@nobet/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { fetchEventsWithOdds, fetchSports } from "../lib/odds-api.js";
import { publicProcedure, router } from "../trpc/trpc.js";

/** Derive short name from team name (e.g. "Manchester United" -> "MUN") */
function toShortName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase();
}

const SPORT_ICONS: Record<string, string> = {
  americanfootball_nfl: "🏈",
  americanfootball_ncaaf: "🏈",
  basketball_nba: "🏀",
  basketball_ncaab: "🏀",
  baseball_mlb: "⚾",
  soccer_epl: "⚽",
  soccer_spain_la_liga: "⚽",
  soccer_uefa_champs_league: "⚽",
  soccer_fifa_world_cup: "⚽",
  icehockey_nhl: "🏒",
  tennis_atp_indian_wells: "🎾",
  tennis_wta_indian_wells: "🎾",
  mma_mixed_martial_arts: "🥊",
  boxing_boxing: "🥊",
  cricket_odi: "🏏",
  rugbyleague_nrl: "🏉",
  rugbyunion_six_nations: "🏉",
};

function sportIcon(key: string): string {
  const base = key.split("_").slice(0, 2).join("_");
  return SPORT_ICONS[key] ?? SPORT_ICONS[base] ?? "🏆";
}

/** Build EventMatch from DB event row + optional odds rows (h2h: home, away, draw) */
function eventToMatch(
  ev: {
    id: string;
    sportKey: string;
    sportTitle: string;
    commenceTime: Date;
    homeTeam: string;
    awayTeam: string;
    completed: boolean;
    scoreHome: number | null;
    scoreAway: number | null;
  },
  oddsRows: { outcomeName: string; price: string }[]
): EventMatch {
  const home = ev.homeTeam;
  const away = ev.awayTeam;
  let oddsHome = 1.9;
  let oddsAway = 1.9;
  let oddsDraw: number | undefined;

  for (const o of oddsRows) {
    const price = Number.parseFloat(o.price);
    if (o.outcomeName === home) oddsHome = price;
    else if (o.outcomeName === away) oddsAway = price;
    else oddsDraw = price;
  }

  const now = new Date();
  const commence = ev.commenceTime;
  const isLive =
    !ev.completed &&
    commence.getTime() <= now.getTime() &&
    commence.getTime() + 4 * 60 * 60 * 1000 > now.getTime();
  const startTimeStr = ev.completed
    ? "FT"
    : isLive
      ? "Live"
      : commence.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

  return {
    id: ev.id,
    homeTeam: { name: home, shortName: toShortName(home) },
    awayTeam: { name: away, shortName: toShortName(away) },
    league: ev.sportTitle,
    sport: ev.sportKey,
    odds: { home: oddsHome, away: oddsAway, ...(oddsDraw != null && { draw: oddsDraw }) },
    isLive,
    startTime: startTimeStr,
    ...(ev.completed &&
      ev.scoreHome != null &&
      ev.scoreAway != null && { score: { home: ev.scoreHome, away: ev.scoreAway } }),
  };
}

export const oddsRouter = router({
  /** List sports from DB (synced by cron), with event count; API fallback if DB empty */
  listSports: publicProcedure
    .input(
      z
        .object({
          all: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const all = input?.all ?? false;
      const rows = await db
        .select({
          key: sports.key,
          title: sports.title,
          group: sports.group,
          active: sports.active,
          hasOutrights: sports.hasOutrights,
          eventCount: sql<number>`(select count(*) from ${events} where ${events.sportKey} = ${sports.key})`,
        })
        .from(sports)
        .where(all ? undefined : eq(sports.active, true));

      const filtered = all ? rows : rows.filter((r) => !r.hasOutrights);
      if (filtered.length > 0) {
        return filtered.map((s) => ({
          id: s.key,
          name: s.title,
          group: s.group,
          icon: sportIcon(s.key),
          eventCount: Number(s.eventCount ?? 0),
        })) as Sport[];
      }

      const apiSports = await fetchSports(all);
      const activeOnly = apiSports.filter((s) => s.active && !s.has_outrights);
      return activeOnly.map((s) => ({
        id: s.key,
        name: s.title,
        group: s.group,
        icon: sportIcon(s.key),
        eventCount: 0,
      })) as Sport[];
    }),

  /** List events for a sport from DB; fallback to API if empty */
  listEvents: publicProcedure
    .input(z.object({ sportKey: z.string().min(1) }))
    .query(async ({ input }) => {
      const eventRows = await db
        .select()
        .from(events)
        .where(eq(events.sportKey, input.sportKey))
        .orderBy(asc(events.commenceTime));

      if (eventRows.length === 0) {
        const apiEvents = await fetchEventsWithOdds(input.sportKey);
        return apiEvents.map((ev) => {
          const home = ev.home_team;
          const away = ev.away_team;
          let oddsHome = 1.9;
          let oddsAway = 1.9;
          let oddsDraw: number | undefined;
          const b = ev.bookmakers?.[0];
          const h2h = b?.markets?.find((m) => m.key === "h2h");
          if (h2h?.outcomes) {
            for (const o of h2h.outcomes) {
              if (o.name === home) oddsHome = o.price;
              else if (o.name === away) oddsAway = o.price;
              else oddsDraw = o.price;
            }
          }
          const commence = new Date(ev.commence_time);
          const now = new Date();
          const isLive =
            commence.getTime() <= now.getTime() &&
            commence.getTime() + 4 * 60 * 60 * 1000 > now.getTime();
          return {
            id: ev.id,
            homeTeam: { name: home, shortName: toShortName(home) },
            awayTeam: { name: away, shortName: toShortName(away) },
            league: ev.sport_title,
            sport: input.sportKey,
            odds: { home: oddsHome, away: oddsAway, ...(oddsDraw != null && { draw: oddsDraw }) },
            isLive,
            startTime: isLive
              ? "Live"
              : commence.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
          } as EventMatch;
        });
      }

      const matches: EventMatch[] = [];
      for (const ev of eventRows) {
        const oddsRows = await db
          .select({ outcomeName: odds.outcomeName, price: odds.price })
          .from(odds)
          .where(and(eq(odds.eventId, ev.id), eq(odds.region, "us"), eq(odds.marketKey, "h2h")))
          .limit(10);
        matches.push(eventToMatch(ev, oddsRows));
      }
      return matches;
    }),

  /** Featured events from DB (primary sport) or API fallback */
  getFeatured: publicProcedure.query(async () => {
    const sportRows = await db.select().from(sports).where(eq(sports.active, true));
    const primary =
      sportRows.find(
        (s) => !s.hasOutrights && (s.key.startsWith("soccer_") || s.key === "basketball_nba")
      ) ?? sportRows.find((s) => !s.hasOutrights);

    if (!primary) {
      const apiSports = await fetchSports(false);
      const p = apiSports.find((s) => s.active && !s.has_outrights);
      if (!p) return [];
      const apiEvents = await fetchEventsWithOdds(p.key);
      return apiEvents.slice(0, 5).map((ev) => {
        const home = ev.home_team;
        const away = ev.away_team;
        let oddsHome = 1.9;
        let oddsAway = 1.9;
        let oddsDraw: number | undefined;
        const b = ev.bookmakers?.[0];
        const h2h = b?.markets?.find((m) => m.key === "h2h");
        if (h2h?.outcomes) {
          for (const o of h2h.outcomes) {
            if (o.name === home) oddsHome = o.price;
            else if (o.name === away) oddsAway = o.price;
            else oddsDraw = o.price;
          }
        }
        const commence = new Date(ev.commence_time);
        const now = new Date();
        const isLive =
          commence.getTime() <= now.getTime() &&
          commence.getTime() + 4 * 60 * 60 * 1000 > now.getTime();
        return {
          id: ev.id,
          homeTeam: { name: home, shortName: toShortName(home) },
          awayTeam: { name: away, shortName: toShortName(away) },
          league: ev.sport_title,
          sport: p.key,
          odds: { home: oddsHome, away: oddsAway, ...(oddsDraw != null && { draw: oddsDraw }) },
          isLive,
          startTime: isLive
            ? "Live"
            : commence.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
        } as EventMatch;
      });
    }

    const eventRows = await db
      .select()
      .from(events)
      .where(eq(events.sportKey, primary.key))
      .orderBy(asc(events.commenceTime))
      .limit(5);

    const matches: EventMatch[] = [];
    for (const ev of eventRows) {
      const oddsRows = await db
        .select({ outcomeName: odds.outcomeName, price: odds.price })
        .from(odds)
        .where(and(eq(odds.eventId, ev.id), eq(odds.region, "us"), eq(odds.marketKey, "h2h")))
        .limit(10);
      matches.push(eventToMatch(ev, oddsRows));
    }
    return matches;
  }),
});
