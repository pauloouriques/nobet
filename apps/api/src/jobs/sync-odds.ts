import { db } from "@nobet/db";
import { events, odds, sports } from "@nobet/db";
import type { OddsApiEvent, OddsApiScoreEvent } from "@nobet/shared";
import { and, eq, sql } from "drizzle-orm";
import { fetchOdds, fetchScores, fetchSports } from "../lib/odds-api.js";

const REGIONS = ["us", "uk", "eu", "au"] as const;
const DAYS_FROM = 1;

export async function syncSports(): Promise<{ inserted: number; updated: number }> {
  const list = await fetchSports(true);
  console.log(`Fetched ${list.length} sports from Odds API`);
  let inserted = 0;
  let updated = 0;

  for (const s of list) {
    const existing = await db.select().from(sports).where(eq(sports.key, s.key)).limit(1);

    const row = {
      key: s.key,
      group: s.group,
      title: s.title,
      description: s.description,
      active: s.active,
      hasOutrights: s.has_outrights,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      await db.insert(sports).values(row);
      inserted++;
    } else {
      await db.update(sports).set(row).where(eq(sports.key, s.key));
      updated++;
    }
  }

  return { inserted, updated };
}

function parseScores(ev: OddsApiScoreEvent): {
  scoreHome: number | null;
  scoreAway: number | null;
} {
  let scoreHome: number | null = null;
  let scoreAway: number | null = null;
  if (ev.scores?.length) {
    for (const s of ev.scores) {
      const score = Number.parseInt(s.score, 10);
      if (Number.isNaN(score)) continue;
      if (s.name === ev.home_team) scoreHome = score;
      else if (s.name === ev.away_team) scoreAway = score;
    }
  }
  return { scoreHome, scoreAway };
}

export async function syncScoresForSport(sportKey: string): Promise<number> {
  const list = await fetchScores(sportKey, DAYS_FROM);
  let count = 0;

  for (const ev of list) {
    const { scoreHome, scoreAway } = parseScores(ev);
    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, ev.id))
      .limit(1);

    const row = {
      id: ev.id,
      sportKey: ev.sport_key,
      sportTitle: ev.sport_title,
      commenceTime: new Date(ev.commence_time),
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      completed: ev.completed,
      scoreHome,
      scoreAway,
      lastUpdate: ev.last_update ? new Date(ev.last_update) : null,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      await db.insert(events).values(row);
    } else {
      await db
        .update(events)
        .set({
          completed: row.completed,
          scoreHome: row.scoreHome,
          scoreAway: row.scoreAway,
          lastUpdate: row.lastUpdate,
          updatedAt: row.updatedAt,
        })
        .where(eq(events.id, ev.id));
    }
    count++;
  }

  return count;
}

async function upsertEventFromOdds(ev: OddsApiEvent): Promise<void> {
  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, ev.id))
    .limit(1);
  const row = {
    id: ev.id,
    sportKey: ev.sport_key,
    sportTitle: ev.sport_title,
    commenceTime: new Date(ev.commence_time),
    homeTeam: ev.home_team,
    awayTeam: ev.away_team,
    completed: false,
    updatedAt: new Date(),
  };
  if (existing.length === 0) {
    await db.insert(events).values(row);
  } else {
    await db
      .update(events)
      .set({ sportTitle: row.sportTitle, updatedAt: row.updatedAt })
      .where(eq(events.id, ev.id));
  }
}

export async function syncOddsForSport(sportKey: string): Promise<number> {
  let totalOdds = 0;

  for (const region of REGIONS) {
    const list = await fetchOdds(sportKey, { daysFrom: DAYS_FROM, regions: region });

    for (const ev of list) {
      await upsertEventFromOdds(ev);

      await db.delete(odds).where(and(eq(odds.eventId, ev.id), eq(odds.region, region)));

      for (const bookmaker of ev.bookmakers ?? []) {
        for (const market of bookmaker.markets ?? []) {
          if (!market.outcomes?.length) continue;
          await db.insert(odds).values(
            market.outcomes.map((o) => ({
              eventId: ev.id,
              bookmakerKey: bookmaker.key,
              region,
              marketKey: market.key,
              outcomeName: o.name,
              price: String(o.price),
              lastUpdate: bookmaker.last_update ? new Date(bookmaker.last_update) : null,
              updatedAt: new Date(),
            }))
          );
          totalOdds += market.outcomes.length;
        }
      }
    }
  }

  return totalOdds;
}

export async function runSync(): Promise<{
  sports: { inserted: number; updated: number };
  eventsBySport: Record<string, { events: number; odds: number }>;
}> {
  // Ensure events.result exists (idempotent; safe if migration already ran)
  await db.execute(sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS result text`);

  const sportsResult = await syncSports();
  const eventCounts: Record<string, { events: number; odds: number }> = {};

  const sportList = await db.select().from(sports).where(eq(sports.active, true));
  const toSync = sportList.filter((s) => !s.hasOutrights && s.key.startsWith("soccer_"));

  for (const s of toSync) {
    try {
      const eventsCount = await syncScoresForSport(s.key);
      const oddsCount = await syncOddsForSport(s.key);
      eventCounts[s.key] = { events: eventsCount, odds: oddsCount };
    } catch (err) {
      console.error(`[sync] ${s.key} failed:`, err);
      eventCounts[s.key] = { events: 0, odds: 0 };
    }
  }

  return {
    sports: sportsResult,
    eventsBySport: eventCounts,
  };
}
