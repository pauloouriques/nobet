import type { OddsApiEvent, OddsApiScoreEvent, OddsApiSport } from "@nobet/shared";

const DEFAULT_ODDS_PROVIDER_BASE = "https://api.the-odds-api.com/v4";

function getBaseUrl(): string {
  const url = process.env.ODDS_PROVIDER_BASE_URL;
  return url ?? DEFAULT_ODDS_PROVIDER_BASE;
}

const ALL_REGIONS = "us,uk,eu,au";

function getApiKey(): string {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    throw new Error("ODDS_API_KEY is not set. Add it to your .env file.");
  }
  return key;
}

/**
 * Fetch all sports (in-season by default, or all with all=true)
 */
export async function fetchSports(all = true): Promise<OddsApiSport[]> {
  const apiKey = getApiKey();
  const base = getBaseUrl();
  const url = `${base}/sports?apiKey=${apiKey}&all=${all}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API sports failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as OddsApiSport[];
  return data;
}

/**
 * Fetch scores for a sport. daysFrom=1 means today + past day.
 */
export async function fetchScores(sportKey: string, daysFrom = 1): Promise<OddsApiScoreEvent[]> {
  const apiKey = getApiKey();
  const base = getBaseUrl();
  const url = `${base}/sports/${encodeURIComponent(sportKey)}/scores?apiKey=${apiKey}&daysFrom=${daysFrom}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API scores failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as OddsApiScoreEvent[];
  return data;
}

/**
 * Fetch events with odds for a sport. Multiple regions, decimal odds.
 */
export async function fetchOdds(
  sportKey: string,
  options: { daysFrom?: number; regions?: string } = {}
): Promise<OddsApiEvent[]> {
  const apiKey = getApiKey();
  const daysFrom = options.daysFrom ?? 1;
  const regions = options.regions ?? ALL_REGIONS;
  const params = new URLSearchParams({
    apiKey,
    regions,
    markets: "h2h",
    oddsFormat: "decimal",
    daysFrom: String(daysFrom),
  });
  const url = `${getBaseUrl()}/sports/${encodeURIComponent(sportKey)}/odds?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API odds failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as OddsApiEvent[];
  return data;
}

/**
 * Fetch events with odds (single region us). For backward compatibility / tRPC.
 */
export async function fetchEventsWithOdds(sportKey: string): Promise<OddsApiEvent[]> {
  return fetchOdds(sportKey, { regions: "us", daysFrom: 2 });
}
