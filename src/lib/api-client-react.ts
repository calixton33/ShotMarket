import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

export type MarketSide = "over" | "under";
export type WinningSide = MarketSide | "push";
export type EventStatus = "active" | "pending" | "resolved";
export type BetStatus = "open" | "won" | "lost" | "push";

export interface User {
  id: number;
  username: string;
  balance: number;
  isAdmin: boolean;
  adminMode: boolean;
  wins: number;
  losses: number;
  totalBets: number;
  winRate: number;
}

interface StoreUser extends User {
  password: string;
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
  userId: number;
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

interface LocalStore {
  currentUserId: number | null;
  nextUserId: number;
  nextEventId: number;
  nextBetId: number;
  settings: Settings;
  users: StoreUser[];
  events: Event[];
  bets: Bet[];
  shotHistory: Array<{ date: string; cumulativeTotal: number }>;
}

type LocalQueryOptions<T> = {
  query?: Omit<UseQueryOptions<T, Error, T, QueryKey>, "queryKey" | "queryFn"> & {
    queryKey?: QueryKey;
  };
};

const STORAGE_KEY = "shotmarket.local.v1";
const DEFAULT_TRACKED_PERSON_NAME = "Jia Xuan";
const DEFAULT_GRAND_LINE = 100;
const DEFAULT_STARTING_BALANCE = 100;

export const getGetMeQueryKey = () => ["me"] as const;
export const getGetDashboardQueryKey = () => ["dashboard"] as const;
export const getGetLeaderboardQueryKey = () => ["leaderboard"] as const;
export const getGetGrandMarketQueryKey = () => ["grand-market"] as const;
export const getGetEventQueryKey = (eventId: number) => ["event", eventId] as const;
export const getGetSettingsQueryKey = () => ["settings"] as const;
export const getListEventsQueryKey = () => ["events"] as const;
export const getListUsersQueryKey = () => ["users"] as const;

function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
}

function seedStore(): LocalStore {
  return {
    currentUserId: null,
    nextUserId: 2,
    nextEventId: 1,
    nextBetId: 1,
    settings: {
      trackedPersonName: DEFAULT_TRACKED_PERSON_NAME,
      grandLine: DEFAULT_GRAND_LINE,
      grandStartDate: isoDate(2026, 6, 1),
      grandEndDate: isoDate(2026, 8, 31),
      cumulativeShots: 0,
      grandStatus: "active",
    },
    users: [
      {
        id: 1,
        username: "admin",
        password: "admin",
        balance: DEFAULT_STARTING_BALANCE,
        isAdmin: true,
        adminMode: true,
        wins: 0,
        losses: 0,
        totalBets: 0,
        winRate: 0,
      },
    ],
    events: [],
    bets: [],
    shotHistory: [
      { date: isoDate(2026, 6, 1), cumulativeTotal: 0 },
    ],
  };
}

function resetGrandCount(store: LocalStore) {
  store.settings.cumulativeShots = 0;
  store.shotHistory = [
    {
      date: store.settings.grandStartDate,
      cumulativeTotal: 0,
    },
  ];
}

function resetUserStats(user: StoreUser) {
  user.balance = DEFAULT_STARTING_BALANCE;
  user.adminMode = user.isAdmin;
  user.wins = 0;
  user.losses = 0;
  user.totalBets = 0;
  user.winRate = 0;
}

function resetPlayersAndPools(store: LocalStore) {
  const currentUser = store.users.find(
    (candidate) => candidate.id === store.currentUserId,
  );
  const fallbackAdmin = store.users.find((candidate) => candidate.isAdmin);
  const keptUser = currentUser?.isAdmin ? currentUser : fallbackAdmin ?? seedStore().users[0];

  keptUser.isAdmin = true;
  resetUserStats(keptUser);

  store.currentUserId = keptUser.id;
  store.users = [keptUser];
  store.nextUserId = Math.max(keptUser.id + 1, 2);
  store.nextEventId = 1;
  store.nextBetId = 1;
  store.events = [];
  store.bets = [];
  store.settings.trackedPersonName = DEFAULT_TRACKED_PERSON_NAME;
  store.settings.grandLine = DEFAULT_GRAND_LINE;
  store.settings.grandStatus = "active";
  delete store.settings.grandWinningSide;
  resetGrandCount(store);
}

function resetPoolsAndBalances(store: LocalStore) {
  for (const user of store.users) {
    resetUserStats(user);
  }

  store.nextBetId = 1;
  store.bets = [];
  store.settings.grandStatus = "active";
  delete store.settings.grandWinningSide;
  resetGrandCount(store);
}

function migrateStore(store: LocalStore) {
  if (
    store.settings.trackedPersonName === "Alex" &&
    store.settings.grandLine === 55.5
  ) {
    store.settings.trackedPersonName = DEFAULT_TRACKED_PERSON_NAME;
    store.settings.grandLine = DEFAULT_GRAND_LINE;
  }

  if (store.events.length === 0 && store.settings.cumulativeShots !== 0) {
    resetGrandCount(store);
  }

  return store;
}

function getStore() {
  if (typeof window === "undefined") return seedStore();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedStore();
    saveStore(seeded);
    return seeded;
  }

  try {
    const store = migrateStore(JSON.parse(raw) as LocalStore);
    saveStore(store);
    return store;
  } catch {
    const seeded = seedStore();
    saveStore(seeded);
    return seeded;
  }
}

function saveStore(store: LocalStore) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
}

function publicUser(user: StoreUser): User {
  const total = user.wins + user.losses;
  return {
    id: user.id,
    username: user.username,
    balance: user.balance,
    isAdmin: user.isAdmin,
    adminMode: user.adminMode,
    wins: user.wins,
    losses: user.losses,
    totalBets: user.totalBets,
    winRate: total ? Math.round((user.wins / total) * 100) : 0,
  };
}

function requireCurrentUser(store: LocalStore) {
  const user = store.users.find((candidate) => candidate.id === store.currentUserId);
  if (!user) throw new Error("Please log in first.");
  return user;
}

function requireAdmin(store: LocalStore, requireAdminMode = true) {
  const user = requireCurrentUser(store);
  if (!user.isAdmin) throw new Error("Admin access required.");
  if (requireAdminMode && !user.adminMode) {
    throw new Error("Admin mode is required.");
  }
  return user;
}

function requireMarketSide(side: MarketSide) {
  if (side !== "over" && side !== "under") {
    throw new Error("Invalid market side.");
  }
}

function requirePositiveNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function requireNonNegativeNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative.`);
  }
}

function requireValidDate(value: string, label: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} must be a valid date.`);
  }
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

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getWinningSide(actualShots: number, line: number): WinningSide {
  if (actualShots > line) return "over";
  if (actualShots < line) return "under";
  return "push";
}

function settleBets(store: LocalStore, bets: Bet[], winningSide: WinningSide) {
  const totalPool = sum(bets.map((bet) => bet.stake));
  const winningPool = sum(
    bets.filter((bet) => bet.side === winningSide).map((bet) => bet.stake),
  );

  for (const bet of bets) {
    if (bet.status !== "open") continue;

    const user = store.users.find((candidate) => candidate.id === bet.userId);
    if (!user) continue;

    if (winningSide === "push") {
      bet.status = "push";
      bet.payout = bet.stake;
      user.balance += bet.stake;
      continue;
    }

    if (bet.side === winningSide) {
      bet.status = "won";
      bet.payout = winningPool ? (bet.stake / winningPool) * totalPool : bet.stake;
      user.balance += bet.payout;
      user.wins += 1;
    } else {
      bet.status = "lost";
      bet.payout = 0;
      user.losses += 1;
    }

    user.totalBets += 1;
  }
}

function refundOpenBets(store: LocalStore, bets: Bet[]) {
  for (const bet of bets) {
    if (bet.status !== "open") continue;

    const user = store.users.find((candidate) => candidate.id === bet.userId);
    if (!user) continue;

    user.balance += bet.stake;
    bet.status = "push";
    bet.payout = bet.stake;
  }
}

function removeEventFromStore(store: LocalStore, event: Event) {
  const eventBets = store.bets.filter(
    (bet) => bet.market === "event" && bet.eventId === event.id,
  );
  refundOpenBets(store, eventBets);

  store.events = store.events.filter((candidate) => candidate.id !== event.id);
  store.bets = store.bets.filter(
    (bet) => !(bet.market === "event" && bet.eventId === event.id),
  );

  if (event.status === "resolved" && event.actualShots) {
    store.settings.cumulativeShots = Math.max(
      0,
      store.settings.cumulativeShots - event.actualShots,
    );
    store.shotHistory = store.shotHistory.filter(
      (point) => point.date !== event.eventDate,
    );
  }
}

function useLocalQuery<T>(
  queryKey: QueryKey,
  queryFn: () => T,
  options?: LocalQueryOptions<T>,
) {
  const queryOptions = options?.query;

  return useQuery<T, Error, T, QueryKey>({
    ...queryOptions,
    queryKey: queryOptions?.queryKey ?? queryKey,
    queryFn: async () => queryFn(),
  });
}

export function useGetMe(options?: LocalQueryOptions<User | null>) {
  return useLocalQuery(getGetMeQueryKey(), () => {
    const store = getStore();
    const user = store.users.find((candidate) => candidate.id === store.currentUserId);
    return user ? publicUser(user) : null;
  }, options);
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ data }: { data: { username: string; password: string } }) => {
      const username = data.username.trim();
      if (!username) throw new Error("Username is required.");

      const store = getStore();
      let user = store.users.find(
        (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
      );

      if (!user) {
        user = {
          id: store.nextUserId++,
          username,
          password: data.password,
          balance: 100,
          isAdmin: false,
          adminMode: false,
          wins: 0,
          losses: 0,
          totalBets: 0,
          winRate: 0,
        };
        store.users.push(user);
      }

      if (user.password !== data.password) {
        throw new Error("Invalid username or password.");
      }

      store.currentUserId = user.id;
      saveStore(store);
      return publicUser(user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({ data }: { data: { username: string; password: string } }) => {
      const username = data.username.trim();
      if (!username) throw new Error("Username is required.");

      const store = getStore();
      const existingUser = store.users.find(
        (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
      );

      if (existingUser) throw new Error("That username is already taken.");

      const user: StoreUser = {
        id: store.nextUserId++,
        username,
        password: data.password,
        balance: 100,
        isAdmin: false,
        adminMode: false,
        wins: 0,
        losses: 0,
        totalBets: 0,
        winRate: 0,
      };

      store.users.push(user);
      store.currentUserId = user.id;
      saveStore(store);
      return publicUser(user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const store = getStore();
      store.currentUserId = null;
      saveStore(store);
      return null;
    },
  });
}

export function useSetAdminMode() {
  return useMutation({
    mutationFn: async ({ data }: { data: { enabled: boolean } }) => {
      const store = getStore();
      const user = requireCurrentUser(store);
      if (!user.isAdmin) throw new Error("Admin access required.");

      user.adminMode = data.enabled;
      saveStore(store);
      return publicUser(user);
    },
  });
}

export function useGetDashboard(options?: LocalQueryOptions<Dashboard>) {
  return useLocalQuery(getGetDashboardQueryKey(), () => {
    const store = getStore();
    const sortedEvents = [...store.events].sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );
    const grandBets = store.bets.filter((bet) => bet.market === "grand");

    return {
      settings: store.settings,
      activeEvents: sortedEvents.filter((event) => event.status === "active"),
      pendingEvents: sortedEvents.filter((event) => event.status === "pending"),
      resolvedEvents: sortedEvents.filter((event) => event.status === "resolved"),
      grandMarketSummary: getMarketSummary(grandBets),
    };
  }, options);
}

export function useGetLeaderboard(options?: LocalQueryOptions<User[]>) {
  return useLocalQuery(getGetLeaderboardQueryKey(), () => {
    const store = getStore();
    return store.users
      .map(publicUser)
      .sort((a, b) => b.balance - a.balance);
  }, options);
}

export function useGetEvent(eventId: number, options?: LocalQueryOptions<{
  event: Event;
  overPool: number;
  underPool: number;
  overPct: number;
  underPct: number;
  userBets: Bet[];
} | null>) {
  return useLocalQuery(getGetEventQueryKey(eventId), () => {
    const store = getStore();
    const event = store.events.find((candidate) => candidate.id === eventId);
    if (!event) return null;

    const eventBets = store.bets.filter(
      (bet) => bet.market === "event" && bet.eventId === eventId,
    );
    const currentUserId = store.currentUserId;

    return {
      event,
      ...getMarketSummary(eventBets),
      userBets: eventBets.filter((bet) => bet.userId === currentUserId),
    };
  }, options);
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
      const store = getStore();
      const user = requireCurrentUser(store);
      const event = store.events.find((candidate) => candidate.id === eventId);

      requireMarketSide(data.side);
      requirePositiveNumber(data.stake, "Stake");
      if (!event) throw new Error("Event not found.");
      if (event.status !== "active") throw new Error("This market is closed.");
      if (data.stake > user.balance) throw new Error("Insufficient balance.");

      const bet: Bet = {
        id: store.nextBetId++,
        userId: user.id,
        eventId,
        market: "event",
        side: data.side,
        stake: data.stake,
        status: "open",
        payout: 0,
        createdAt: new Date().toISOString(),
      };

      user.balance -= data.stake;
      store.bets.push(bet);
      saveStore(store);
      return bet;
    },
  });
}

export function useGetGrandMarket(options?: LocalQueryOptions<{
  settings: Settings;
  overPool: number;
  underPool: number;
  overPct: number;
  underPct: number;
  shotHistory: Array<{ date: string; cumulativeTotal: number }>;
  userBets: Bet[];
}>) {
  return useLocalQuery(getGetGrandMarketQueryKey(), () => {
    const store = getStore();
    const grandBets = store.bets.filter((bet) => bet.market === "grand");

    return {
      settings: store.settings,
      ...getMarketSummary(grandBets),
      shotHistory: store.shotHistory,
      userBets: grandBets.filter((bet) => bet.userId === store.currentUserId),
    };
  }, options);
}

export function usePlaceBetOnGrand() {
  return useMutation({
    mutationFn: async ({ data }: { data: { side: MarketSide; stake: number } }) => {
      const store = getStore();
      const user = requireCurrentUser(store);

      requireMarketSide(data.side);
      requirePositiveNumber(data.stake, "Stake");
      if (store.settings.grandStatus !== "active") {
        throw new Error("The grand market is already resolved.");
      }
      if (data.stake > user.balance) throw new Error("Insufficient balance.");

      const bet: Bet = {
        id: store.nextBetId++,
        userId: user.id,
        market: "grand",
        side: data.side,
        stake: data.stake,
        status: "open",
        payout: 0,
        createdAt: new Date().toISOString(),
      };

      user.balance -= data.stake;
      store.bets.push(bet);
      saveStore(store);
      return bet;
    },
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: async ({ data }: { data: { password: string } }) => {
      const store = getStore();
      const user = requireAdmin(store, false);
      if (user.password !== data.password) throw new Error("Invalid admin password.");

      user.adminMode = true;
      saveStore(store);
      return publicUser(user);
    },
  });
}

export function useGetSettings(options?: LocalQueryOptions<Settings>) {
  return useLocalQuery(getGetSettingsQueryKey(), () => getStore().settings, options);
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Settings> }) => {
      const store = getStore();
      requireAdmin(store);

      if (data.trackedPersonName !== undefined && !data.trackedPersonName.trim()) {
        throw new Error("Tracked person name is required.");
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

      store.settings = {
        ...store.settings,
        ...data,
        grandStartDate: data.grandStartDate
          ? new Date(data.grandStartDate).toISOString()
          : store.settings.grandStartDate,
        grandEndDate: data.grandEndDate
          ? new Date(data.grandEndDate).toISOString()
          : store.settings.grandEndDate,
      };
      saveStore(store);
      return store.settings;
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
      const store = getStore();
      requireAdmin(store);
      if (!data.title.trim()) throw new Error("Event title is required.");
      requirePositiveNumber(data.line, "Line");
      requireValidDate(data.eventDate, "Event date");

      const event: Event = {
        id: store.nextEventId++,
        title: data.title.trim(),
        eventDate: data.eventDate,
        line: data.line,
        status: "active",
      };

      store.events.push(event);
      saveStore(store);
      return event;
    },
  });
}

export function useListEvents(options?: LocalQueryOptions<Event[]>) {
  return useLocalQuery(getListEventsQueryKey(), () => {
    return [...getStore().events].sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );
  }, options);
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
      const store = getStore();
      requireAdmin(store);
      requireNonNegativeNumber(data.actualShots, "Actual shots");

      const event = store.events.find((candidate) => candidate.id === eventId);
      if (!event) throw new Error("Event not found.");
      if (event.status === "resolved") throw new Error("Event is already resolved.");

      const winningSide = getWinningSide(data.actualShots, event.line);
      event.status = "resolved";
      event.actualShots = data.actualShots;
      event.winningSide = winningSide;
      store.settings.cumulativeShots += data.actualShots;
      store.shotHistory.push({
        date: event.eventDate,
        cumulativeTotal: store.settings.cumulativeShots,
      });

      settleBets(
        store,
        store.bets.filter((bet) => bet.market === "event" && bet.eventId === eventId),
        winningSide,
      );
      saveStore(store);
      return event;
    },
  });
}

export function useDeleteEvent() {
  return useMutation({
    mutationFn: async ({ eventId }: { eventId: number }) => {
      const store = getStore();
      requireAdmin(store);

      const event = store.events.find((candidate) => candidate.id === eventId);
      if (!event) throw new Error("Event not found.");

      removeEventFromStore(store, event);
      saveStore(store);
      return event;
    },
  });
}

export function useClearEvents() {
  return useMutation({
    mutationFn: async () => {
      const store = getStore();
      requireAdmin(store);

      const eventsToRemove = [...store.events];

      for (const event of eventsToRemove) {
        removeEventFromStore(store, event);
      }
      resetGrandCount(store);

      saveStore(store);
      return eventsToRemove;
    },
  });
}

export function useResetPlayersAndPools() {
  return useMutation({
    mutationFn: async () => {
      const store = getStore();
      requireAdmin(store);

      resetPlayersAndPools(store);
      saveStore(store);

      return {
        user: publicUser(requireCurrentUser(store)),
      };
    },
  });
}

export function useResetPoolsAndBalances() {
  return useMutation({
    mutationFn: async () => {
      const store = getStore();
      requireAdmin(store);

      resetPoolsAndBalances(store);
      saveStore(store);

      return {
        users: store.users.map(publicUser),
        user: publicUser(requireCurrentUser(store)),
      };
    },
  });
}

export function useResolveGrandMarket() {
  return useMutation({
    mutationFn: async () => {
      const store = getStore();
      requireAdmin(store);

      if (store.settings.grandStatus === "resolved") {
        throw new Error("Grand market is already resolved.");
      }

      const winningSide = getWinningSide(
        store.settings.cumulativeShots,
        store.settings.grandLine,
      );
      store.settings.grandStatus = "resolved";
      store.settings.grandWinningSide = winningSide;
      settleBets(
        store,
        store.bets.filter((bet) => bet.market === "grand"),
        winningSide,
      );
      saveStore(store);
      return store.settings;
    },
  });
}

export function useListUsers(options?: LocalQueryOptions<User[]>) {
  return useLocalQuery(getListUsersQueryKey(), () => {
    const store = getStore();
    requireAdmin(store);
    return store.users.map(publicUser);
  }, options);
}

export function usePromoteUser() {
  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: number;
      data: { isAdmin: boolean };
    }) => {
      const store = getStore();
      requireAdmin(store);

      const user = store.users.find((candidate) => candidate.id === userId);
      if (!user) throw new Error("User not found.");

      user.isAdmin = data.isAdmin;
      if (!user.isAdmin) user.adminMode = false;
      saveStore(store);
      return publicUser(user);
    },
  });
}

export function useGiveUserMoney() {
  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: number;
      data: { amount: number };
    }) => {
      const store = getStore();
      requireAdmin(store);
      requirePositiveNumber(data.amount, "Amount");

      const user = store.users.find((candidate) => candidate.id === userId);
      if (!user) throw new Error("User not found.");

      user.balance += data.amount;
      saveStore(store);
      return publicUser(user);
    },
  });
}
