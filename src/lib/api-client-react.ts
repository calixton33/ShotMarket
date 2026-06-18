import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { requireSupabaseConfigured, supabase } from "@/lib/supabase";

export type MarketSide = "over" | "under";
export type WinningSide = MarketSide | "push";
export type EventStatus = "active" | "pending" | "resolved";
export type BetStatus = "open" | "won" | "lost" | "push";

export interface User {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  adminMode: boolean;
  wins: number;
  losses: number;
  totalBets: number;
  winRate: number;
}

export interface Event {
  id: number;
  title: string;
  eventDate: string;
  line: number;
  status: EventStatus;
  actualShots?: number;
  winningSide?: WinningSide;
}

export interface Bet {
  id: number;
  userId: string;
  eventId?: number;
  market: "event" | "grand";
  side: MarketSide;
  stake: number;
  status: BetStatus;
  payout: number;
  createdAt: string;
}

export interface Settings {
  trackedPersonName: string;
  grandLine: number;
  grandStartDate: string;
  grandEndDate: string;
  cumulativeShots: number;
  grandStatus: "active" | "resolved";
  grandWinningSide?: WinningSide;
}

export interface Dashboard {
  settings: Settings;
  activeEvents: Event[];
  pendingEvents: Event[];
  resolvedEvents: Event[];
  grandMarketSummary: MarketSummary;
}

interface MarketSummary {
  overPool: number;
  underPool: number;
  overPct: number;
  underPct: number;
}

type SupabaseQueryOptions<T> = {
  query?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn"> & {
    queryKey?: QueryKey;
  };
};

type ProfileRow = {
  id: string;
  username: string;
  balance: number | string;
  is_admin: boolean;
  admin_mode: boolean;
  wins: number;
  losses: number;
  total_bets: number;
  win_rate: number;
};

type EventRow = {
  id: number | string;
  title: string;
  event_date: string;
  line: number | string;
  status: EventStatus;
  actual_shots: number | string | null;
  winning_side: WinningSide | null;
};

type BetRow = {
  id: number | string;
  user_id: string;
  event_id: number | string | null;
  market: "event" | "grand";
  side: MarketSide;
  stake: number | string;
  status: BetStatus;
  payout: number | string;
  created_at: string;
};

type SettingsRow = {
  tracked_person_name: string;
  grand_line: number | string;
  grand_start_date: string;
  grand_end_date: string;
  cumulative_shots: number | string;
  grand_status: "active" | "resolved";
  grand_winning_side: WinningSide | null;
};

type ShotHistoryRow = {
  shot_date: string;
  cumulative_total: number | string;
};

const DEFAULT_TRACKED_PERSON_NAME = "Jia Xuan";
const DEFAULT_GRAND_LINE = 100;
const DEFAULT_STARTING_BALANCE = 100;
const AUTH_EMAIL_DOMAIN = "shotmarket.local";
const PROFILE_COLUMNS =
  "id, username, balance, is_admin, admin_mode, wins, losses, total_bets, win_rate";

export const getGetMeQueryKey = () => ["me"] as const;
export const getGetDashboardQueryKey = () => ["dashboard"] as const;
export const getGetLeaderboardQueryKey = () => ["leaderboard"] as const;
export const getGetGrandMarketQueryKey = () => ["grand-market"] as const;
export const getGetEventQueryKey = (eventId: number) => ["event", eventId] as const;
export const getGetSettingsQueryKey = () => ["settings"] as const;
export const getListEventsQueryKey = () => ["events"] as const;
export const getListUsersQueryKey = () => ["users"] as const;

function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function appError(error: unknown, fallback?: string) {
  const message = getErrorMessage(error, fallback);
  return Object.assign(new Error(message), { error: message });
}

function fail(error: unknown, fallback?: string): never {
  throw appError(error, fallback);
}

function assertNoError(error: unknown, fallback?: string) {
  if (error) fail(error, fallback);
}

function normalizeUsername(username: string) {
  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) fail("Username is required.");
  return normalized.slice(0, 32);
}

function getAuthEmail(username: string) {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    username: row.username,
    balance: Number(row.balance),
    isAdmin: row.is_admin,
    adminMode: row.admin_mode,
    wins: row.wins,
    losses: row.losses,
    totalBets: row.total_bets,
    winRate: row.win_rate,
  };
}

function toEvent(row: EventRow): Event {
  return {
    id: Number(row.id),
    title: row.title,
    eventDate: row.event_date,
    line: Number(row.line),
    status: row.status,
    actualShots: row.actual_shots === null ? undefined : Number(row.actual_shots),
    winningSide: row.winning_side ?? undefined,
  };
}

function toBet(row: BetRow): Bet {
  return {
    id: Number(row.id),
    userId: row.user_id,
    eventId: row.event_id === null ? undefined : Number(row.event_id),
    market: row.market,
    side: row.side,
    stake: Number(row.stake),
    status: row.status,
    payout: Number(row.payout),
    createdAt: row.created_at,
  };
}

function toSettings(row: SettingsRow): Settings {
  return {
    trackedPersonName: row.tracked_person_name,
    grandLine: Number(row.grand_line),
    grandStartDate: row.grand_start_date,
    grandEndDate: row.grand_end_date,
    cumulativeShots: Number(row.cumulative_shots),
    grandStatus: row.grand_status,
    grandWinningSide: row.grand_winning_side ?? undefined,
  };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getMarketSummary(bets: Bet[]) {
  const overPool = sum(bets.filter((bet) => bet.side === "over").map((bet) => bet.stake));
  const underPool = sum(bets.filter((bet) => bet.side === "under").map((bet) => bet.stake));
  const total = overPool + underPool;

  return {
    overPool,
    underPool,
    overPct: total ? Math.round((overPool / total) * 100) : 50,
    underPct: total ? Math.round((underPool / total) * 100) : 50,
  };
}

function getWinningSide(actualShots: number, line: number): WinningSide {
  if (actualShots > line) return "over";
  if (actualShots < line) return "under";
  return "push";
}

function requireMarketSide(side: MarketSide) {
  if (side !== "over" && side !== "under") {
    fail("Invalid market side.");
  }
}

function requirePositiveNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    fail(`${label} must be greater than zero.`);
  }
}

function requireNonNegativeNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    fail(`${label} cannot be negative.`);
  }
}

function requireValidDate(value: string, label: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    fail(`${label} must be a valid date.`);
  }
}

async function getAuthUser() {
  requireSupabaseConfigured();
  const { data, error } = await supabase.auth.getUser();

  if (error && !error.message.toLowerCase().includes("auth session missing")) {
    fail(error, "Could not read the current session.");
  }

  return data.user ?? null;
}

async function fetchCurrentProfile() {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", authUser.id)
    .maybeSingle();

  assertNoError(error, "Could not load your profile.");
  if (!data) fail("Profile not found. Try signing out and creating the account again.");

  return data as ProfileRow;
}

async function requireCurrentProfile() {
  const profile = await fetchCurrentProfile();
  if (!profile) fail("Please log in first.");
  return profile;
}

async function requireAdminProfile(requireAdminMode = true) {
  const profile = await requireCurrentProfile();

  if (!profile.is_admin) fail("Admin access required.");
  if (requireAdminMode && !profile.admin_mode) {
    fail("Admin mode is required.");
  }

  return profile;
}

async function fetchSettings() {
  const { data, error } = await supabase
    .from("market_settings")
    .select("*")
    .eq("id", 1)
    .single();

  assertNoError(error, "Could not load market settings.");
  return toSettings(data as SettingsRow);
}

async function fetchEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });

  assertNoError(error, "Could not load events.");
  return ((data ?? []) as EventRow[]).map(toEvent);
}

async function fetchBets(filters?: {
  market?: "event" | "grand";
  eventId?: number;
  status?: BetStatus;
}) {
  let query = supabase.from("bets").select("*").order("created_at", { ascending: false });

  if (filters?.market) query = query.eq("market", filters.market);
  if (filters?.eventId !== undefined) query = query.eq("event_id", filters.eventId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  assertNoError(error, "Could not load bets.");
  return ((data ?? []) as BetRow[]).map(toBet);
}

async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("balance", { ascending: false });

  assertNoError(error, "Could not load users.");
  return ((data ?? []) as ProfileRow[]).map(toUser);
}

async function updateProfile(profileId: string, values: Partial<ProfileRow>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", profileId)
    .select(PROFILE_COLUMNS)
    .single();

  assertNoError(error, "Could not update user.");
  return data as ProfileRow;
}

async function resetGrandCount() {
  const settings = await fetchSettings();

  const { error: deleteHistoryError } = await supabase
    .from("shot_history")
    .delete()
    .neq("id", -1);

  assertNoError(deleteHistoryError, "Could not reset shot history.");

  const { error: insertHistoryError } = await supabase
    .from("shot_history")
    .insert({ shot_date: settings.grandStartDate, cumulative_total: 0 });

  assertNoError(insertHistoryError, "Could not reset shot history.");

  const { error: settingsError } = await supabase
    .from("market_settings")
    .update({
      cumulative_shots: 0,
      grand_status: "active",
      grand_winning_side: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  assertNoError(settingsError, "Could not reset market settings.");
}

async function resetGrandMarketDefaults() {
  const { error } = await supabase
    .from("market_settings")
    .update({
      tracked_person_name: DEFAULT_TRACKED_PERSON_NAME,
      grand_line: DEFAULT_GRAND_LINE,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  assertNoError(error, "Could not reset market settings.");
}

async function settleBets(bets: Bet[], winningSide: WinningSide) {
  const openBets = bets.filter((bet) => bet.status === "open");
  if (openBets.length === 0) return;

  const userIds = Array.from(new Set(openBets.map((bet) => bet.userId)));
  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", userIds);

  assertNoError(profilesError, "Could not load bet users.");

  const profilesById = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  const totalPool = sum(openBets.map((bet) => bet.stake));
  const winningPool = sum(
    openBets.filter((bet) => bet.side === winningSide).map((bet) => bet.stake),
  );

  for (const bet of openBets) {
    const profile = profilesById.get(bet.userId);
    if (!profile) continue;

    if (winningSide === "push") {
      const payout = bet.stake;
      const { error: betError } = await supabase
        .from("bets")
        .update({ status: "push", payout })
        .eq("id", bet.id);

      assertNoError(betError, "Could not settle bet.");
      await updateProfile(profile.id, {
        balance: Number(profile.balance) + payout,
      } as Partial<ProfileRow>);
      continue;
    }

    if (bet.side === winningSide) {
      const payout = winningPool ? (bet.stake / winningPool) * totalPool : bet.stake;
      const { error: betError } = await supabase
        .from("bets")
        .update({ status: "won", payout })
        .eq("id", bet.id);

      assertNoError(betError, "Could not settle bet.");
      await updateProfile(profile.id, {
        balance: Number(profile.balance) + payout,
        wins: profile.wins + 1,
      } as Partial<ProfileRow>);
    } else {
      const { error: betError } = await supabase
        .from("bets")
        .update({ status: "lost", payout: 0 })
        .eq("id", bet.id);

      assertNoError(betError, "Could not settle bet.");
      await updateProfile(profile.id, {
        losses: profile.losses + 1,
      } as Partial<ProfileRow>);
    }
  }
}

async function refundOpenEventBets(eventId: number) {
  const openBets = await fetchBets({ market: "event", eventId, status: "open" });
  if (openBets.length === 0) return;

  const userIds = Array.from(new Set(openBets.map((bet) => bet.userId)));
  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .in("id", userIds);

  assertNoError(profilesError, "Could not load users for refunds.");

  const profilesById = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  for (const bet of openBets) {
    const profile = profilesById.get(bet.userId);
    if (!profile) continue;

    await updateProfile(profile.id, {
      balance: Number(profile.balance) + bet.stake,
    } as Partial<ProfileRow>);
  }
}

async function removeEvent(event: Event) {
  await refundOpenEventBets(event.id);

  const { error: deleteEventError } = await supabase
    .from("events")
    .delete()
    .eq("id", event.id);

  assertNoError(deleteEventError, "Could not delete event.");

  if (event.status === "resolved" && event.actualShots !== undefined) {
    const settings = await fetchSettings();
    const { error: settingsError } = await supabase
      .from("market_settings")
      .update({
        cumulative_shots: Math.max(0, settings.cumulativeShots - event.actualShots),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    assertNoError(settingsError, "Could not update shot count.");

    const { error: historyError } = await supabase
      .from("shot_history")
      .delete()
      .eq("shot_date", event.eventDate);

    assertNoError(historyError, "Could not update shot history.");
  }
}

function useSupabaseQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: SupabaseQueryOptions<T>,
) {
  const queryOptions = options?.query;

  return useQuery<T, Error, T, QueryKey>({
    ...queryOptions,
    queryKey: queryOptions?.queryKey ?? queryKey,
    queryFn,
  });
}

export function useGetMe(options?: SupabaseQueryOptions<User | null>) {
  return useSupabaseQuery(
    getGetMeQueryKey(),
    async () => {
      const profile = await fetchCurrentProfile();
      return profile ? toUser(profile) : null;
    },
    options,
  );
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ data }: { data: { username: string; password: string } }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: getAuthEmail(data.username),
        password: data.password,
      });

      assertNoError(error, "Invalid username or password.");
      const profile = await requireCurrentProfile();
      return toUser(profile);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({ data }: { data: { username: string; password: string } }) => {
      const username = normalizeUsername(data.username);

      const { data: authData, error } = await supabase.auth.signUp({
        email: `${username}@${AUTH_EMAIL_DOMAIN}`,
        password: data.password,
        options: {
          data: { username },
        },
      });

      assertNoError(error, "Could not create account.");

      if (!authData.session) {
        fail(
          "Account created, but Supabase email confirmation is enabled. Turn off email confirmation in Supabase Auth settings for this username-only app, then log in.",
        );
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const profile = await fetchCurrentProfile();
        if (profile) return toUser(profile);
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }

      fail("Account created, but the profile was not ready yet. Try logging in.");
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      assertNoError(error, "Could not log out.");
      return null;
    },
  });
}

export function useSetAdminMode() {
  return useMutation({
    mutationFn: async ({ data }: { data: { enabled: boolean } }) => {
      const profile = await requireAdminProfile(false);
      const updated = await updateProfile(profile.id, {
        admin_mode: data.enabled,
      } as Partial<ProfileRow>);

      return toUser(updated);
    },
  });
}

export function useGetDashboard(options?: SupabaseQueryOptions<Dashboard>) {
  return useSupabaseQuery(
    getGetDashboardQueryKey(),
    async () => {
      const [settings, events, bets] = await Promise.all([
        fetchSettings(),
        fetchEvents(),
        fetchBets({ market: "grand" }),
      ]);

      return {
        settings,
        activeEvents: events.filter((event) => event.status === "active"),
        pendingEvents: events.filter((event) => event.status === "pending"),
        resolvedEvents: events.filter((event) => event.status === "resolved"),
        grandMarketSummary: getMarketSummary(bets),
      };
    },
    options,
  );
}

export function useGetLeaderboard(options?: SupabaseQueryOptions<User[]>) {
  return useSupabaseQuery(getGetLeaderboardQueryKey(), fetchProfiles, options);
}

export function useGetEvent(
  eventId: number,
  options?: SupabaseQueryOptions<{
    event: Event;
    overPool: number;
    underPool: number;
    overPct: number;
    underPct: number;
    userBets: Bet[];
  } | null>,
) {
  return useSupabaseQuery(
    getGetEventQueryKey(eventId),
    async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      assertNoError(error, "Could not load event.");
      if (!data) return null;

      const [profile, eventBets] = await Promise.all([
        fetchCurrentProfile(),
        fetchBets({ market: "event", eventId }),
      ]);

      return {
        event: toEvent(data as EventRow),
        ...getMarketSummary(eventBets),
        userBets: eventBets.filter((bet) => bet.userId === profile?.id),
      };
    },
    options,
  );
}

export function usePlaceBetOnEvent() {
  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: number;
      data: { side: MarketSide; stake: number };
    }) => {
      requireMarketSide(data.side);
      requirePositiveNumber(data.stake, "Stake");

      const { data: bet, error } = await supabase.rpc("place_bet", {
        p_market: "event",
        p_side: data.side,
        p_stake: data.stake,
        p_event_id: eventId,
      });

      assertNoError(error, "Could not place bet.");
      return toBet(bet as BetRow);
    },
  });
}

export function useGetGrandMarket(
  options?: SupabaseQueryOptions<{
    settings: Settings;
    overPool: number;
    underPool: number;
    overPct: number;
    underPct: number;
    shotHistory: Array<{ date: string; cumulativeTotal: number }>;
    userBets: Bet[];
  }>,
) {
  return useSupabaseQuery(
    getGetGrandMarketQueryKey(),
    async () => {
      const [profile, settings, grandBets, historyResult] = await Promise.all([
        fetchCurrentProfile(),
        fetchSettings(),
        fetchBets({ market: "grand" }),
        supabase.from("shot_history").select("*").order("shot_date", { ascending: true }),
      ]);

      assertNoError(historyResult.error, "Could not load shot history.");

      return {
        settings,
        ...getMarketSummary(grandBets),
        shotHistory: ((historyResult.data ?? []) as ShotHistoryRow[]).map((point) => ({
          date: point.shot_date,
          cumulativeTotal: Number(point.cumulative_total),
        })),
        userBets: grandBets.filter((bet) => bet.userId === profile?.id),
      };
    },
    options,
  );
}

export function usePlaceBetOnGrand() {
  return useMutation({
    mutationFn: async ({ data }: { data: { side: MarketSide; stake: number } }) => {
      requireMarketSide(data.side);
      requirePositiveNumber(data.stake, "Stake");

      const { data: bet, error } = await supabase.rpc("place_bet", {
        p_market: "grand",
        p_side: data.side,
        p_stake: data.stake,
        p_event_id: null,
      });

      assertNoError(error, "Could not place bet.");
      return toBet(bet as BetRow);
    },
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: async ({ data }: { data: { password: string } }) => {
      const profile = await requireAdminProfile(false);

      const { error } = await supabase.auth.signInWithPassword({
        email: `${profile.username}@${AUTH_EMAIL_DOMAIN}`,
        password: data.password,
      });

      assertNoError(error, "Invalid admin password.");

      const updated = await updateProfile(profile.id, {
        admin_mode: true,
      } as Partial<ProfileRow>);

      return toUser(updated);
    },
  });
}

export function useGetSettings(options?: SupabaseQueryOptions<Settings>) {
  return useSupabaseQuery(getGetSettingsQueryKey(), fetchSettings, options);
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Settings> }) => {
      await requireAdminProfile();

      if (data.trackedPersonName !== undefined && !data.trackedPersonName.trim()) {
        fail("Tracked person name is required.");
      }
      if (data.grandLine !== undefined) {
        requirePositiveNumber(data.grandLine, "Grand line");
      }
      if (data.cumulativeShots !== undefined) {
        requireNonNegativeNumber(data.cumulativeShots, "Cumulative shots");
      }
      if (data.grandStartDate) {
        requireValidDate(data.grandStartDate, "Start date");
      }
      if (data.grandEndDate) {
        requireValidDate(data.grandEndDate, "End date");
      }

      const values = {
        ...(data.trackedPersonName !== undefined
          ? { tracked_person_name: data.trackedPersonName.trim() }
          : {}),
        ...(data.grandLine !== undefined ? { grand_line: data.grandLine } : {}),
        ...(data.cumulativeShots !== undefined
          ? { cumulative_shots: data.cumulativeShots }
          : {}),
        ...(data.grandStartDate
          ? { grand_start_date: new Date(data.grandStartDate).toISOString() }
          : {}),
        ...(data.grandEndDate
          ? { grand_end_date: new Date(data.grandEndDate).toISOString() }
          : {}),
        updated_at: new Date().toISOString(),
      };

      const { data: settings, error } = await supabase
        .from("market_settings")
        .update(values)
        .eq("id", 1)
        .select("*")
        .single();

      assertNoError(error, "Could not update settings.");
      return toSettings(settings as SettingsRow);
    },
  });
}

export function useCreateEvent() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { title: string; eventDate: string; line: number };
    }) => {
      const profile = await requireAdminProfile();
      if (!data.title.trim()) fail("Event title is required.");
      requirePositiveNumber(data.line, "Line");
      requireValidDate(data.eventDate, "Event date");

      const { data: event, error } = await supabase
        .from("events")
        .insert({
          title: data.title.trim(),
          event_date: data.eventDate,
          line: data.line,
          status: "active",
          created_by: profile.id,
        })
        .select("*")
        .single();

      assertNoError(error, "Could not create event.");
      return toEvent(event as EventRow);
    },
  });
}

export function useListEvents(options?: SupabaseQueryOptions<Event[]>) {
  return useSupabaseQuery(getListEventsQueryKey(), fetchEvents, options);
}

export function useResolveEvent() {
  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: number;
      data: { actualShots: number };
    }) => {
      await requireAdminProfile();
      requireNonNegativeNumber(data.actualShots, "Actual shots");

      const { data: eventRow, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      assertNoError(eventError, "Event not found.");

      const event = toEvent(eventRow as EventRow);
      if (event.status === "resolved") fail("Event is already resolved.");

      const winningSide = getWinningSide(data.actualShots, event.line);
      const { data: updatedEvent, error: updateEventError } = await supabase
        .from("events")
        .update({
          status: "resolved",
          actual_shots: data.actualShots,
          winning_side: winningSide,
        })
        .eq("id", eventId)
        .select("*")
        .single();

      assertNoError(updateEventError, "Could not resolve event.");

      const settings = await fetchSettings();
      const nextTotal = settings.cumulativeShots + data.actualShots;

      const { error: settingsError } = await supabase
        .from("market_settings")
        .update({
          cumulative_shots: nextTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      assertNoError(settingsError, "Could not update shot count.");

      const { error: historyError } = await supabase.from("shot_history").insert({
        shot_date: event.eventDate,
        cumulative_total: nextTotal,
      });

      assertNoError(historyError, "Could not update shot history.");

      await settleBets(await fetchBets({ market: "event", eventId }), winningSide);
      return toEvent(updatedEvent as EventRow);
    },
  });
}

export function useDeleteEvent() {
  return useMutation({
    mutationFn: async ({ eventId }: { eventId: number }) => {
      await requireAdminProfile();

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      assertNoError(error, "Event not found.");
      const event = toEvent(data as EventRow);
      await removeEvent(event);
      return event;
    },
  });
}

export function useClearEvents() {
  return useMutation({
    mutationFn: async () => {
      await requireAdminProfile();
      const events = await fetchEvents();

      for (const event of events) {
        await removeEvent(event);
      }

      await resetGrandCount();
      return events;
    },
  });
}

export function useResetPlayersAndPools() {
  return useMutation({
    mutationFn: async () => {
      const profile = await requireAdminProfile();

      const { error: betsError } = await supabase.from("bets").delete().neq("id", -1);
      assertNoError(betsError, "Could not clear bets.");

      const { error: eventsError } = await supabase.from("events").delete().neq("id", -1);
      assertNoError(eventsError, "Could not clear events.");

      const { error: profilesError } = await supabase
        .from("profiles")
        .delete()
        .neq("id", profile.id);

      assertNoError(profilesError, "Could not delete players.");

      const updated = await updateProfile(profile.id, {
        balance: DEFAULT_STARTING_BALANCE,
        is_admin: true,
        admin_mode: true,
        wins: 0,
        losses: 0,
      } as Partial<ProfileRow>);

      await resetGrandCount();
      await resetGrandMarketDefaults();

      return {
        user: toUser(updated),
      };
    },
  });
}

export function useResetPoolsAndBalances() {
  return useMutation({
    mutationFn: async () => {
      await requireAdminProfile();

      const users = await fetchProfiles();

      const { error: betsError } = await supabase.from("bets").delete().neq("id", -1);
      assertNoError(betsError, "Could not clear bets.");

      for (const user of users) {
        await updateProfile(user.id, {
          balance: DEFAULT_STARTING_BALANCE,
          admin_mode: user.isAdmin,
          wins: 0,
          losses: 0,
        } as Partial<ProfileRow>);
      }

      await resetGrandCount();
      const current = await requireCurrentProfile();

      return {
        users: await fetchProfiles(),
        user: toUser(current),
      };
    },
  });
}

export function useResolveGrandMarket() {
  return useMutation({
    mutationFn: async () => {
      await requireAdminProfile();

      const settings = await fetchSettings();
      if (settings.grandStatus === "resolved") {
        fail("Grand market is already resolved.");
      }

      const winningSide = getWinningSide(settings.cumulativeShots, settings.grandLine);
      const { data, error } = await supabase
        .from("market_settings")
        .update({
          grand_status: "resolved",
          grand_winning_side: winningSide,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)
        .select("*")
        .single();

      assertNoError(error, "Could not resolve grand market.");
      await settleBets(await fetchBets({ market: "grand" }), winningSide);
      return toSettings(data as SettingsRow);
    },
  });
}

export function useListUsers(options?: SupabaseQueryOptions<User[]>) {
  return useSupabaseQuery(
    getListUsersQueryKey(),
    async () => {
      await requireAdminProfile();
      return fetchProfiles();
    },
    options,
  );
}

export function usePromoteUser() {
  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { isAdmin: boolean };
    }) => {
      await requireAdminProfile();

      const updated = await updateProfile(userId, {
        is_admin: data.isAdmin,
        admin_mode: data.isAdmin,
      } as Partial<ProfileRow>);

      return toUser(updated);
    },
  });
}

export function useGiveUserMoney() {
  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { amount: number };
    }) => {
      await requireAdminProfile();
      requirePositiveNumber(data.amount, "Amount");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .single();

      assertNoError(error, "User not found.");

      const updated = await updateProfile(userId, {
        balance: Number((profile as ProfileRow).balance) + data.amount,
      } as Partial<ProfileRow>);

      return toUser(updated);
    },
  });
}
