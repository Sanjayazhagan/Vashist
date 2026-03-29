import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { TokenStore, apiFetch } from "@/lib/api";

// ── Shared Types ─────────────────────────────────────────────────────────────
export interface Pool {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  noteCount: number;
  joinCode: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  poolId: string;
  poolName: string;
  grade: number;
  tokensEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  poolId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface UserProfile {
  id?: number;
  name?: string;
  email?: string;
  tokenBalance?: number;
}

// ── Context Shape ─────────────────────────────────────────────────────────────
interface AppState {
  // Auth
  isAuthenticated: boolean;
  isAuthLoading: boolean;          // true while checking localStorage on boot
  user: UserProfile | null;

  // UI
  isDarkMode: boolean;

  // Legacy context data (used as fallback when API pages haven't loaded yet)
  tokenBalances: Record<string, number>;
  pools: Pool[];
  notes: Note[];
  chatSessions: ChatSession[];

  // Auth actions
  login: (token?: string, user?: UserProfile | null) => void;
  logout: () => Promise<void>;

  // UI actions
  toggleDarkMode: () => void;

  // Pool actions (local/mock – real data lives in Pools.tsx state)
  addPool: (pool: Omit<Pool, "id" | "memberCount" | "noteCount" | "joinCode">) => void;
  joinPool: (code: string) => boolean;

  // Note actions
  addNote: (note: Omit<Note, "id" | "grade" | "tokensEarned" | "createdAt" | "updatedAt">) => number;
  deleteNote: (id: string) => void;

  // Token actions
  spendToken: (poolId: string) => boolean;
  getTokenBalance: (poolId: string) => number;
  getTotalTokens: () => number;

  // Chat actions
  addChatSession: (poolId: string) => string;
  addMessageToSession: (sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">) => void;
  getSessionsForPool: (poolId: string) => ChatSession[];
}

// ── Default/fallback mock data (shown before API loads) ───────────────────────
const defaultPools: Pool[] = [];
const defaultNotes: Note[] = [];
const defaultSessions: ChatSession[] = [];

// ── Context ───────────────────────────────────────────────────────────────────
const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading]     = useState(true); // check token on boot
  const [user, setUser]                       = useState<UserProfile | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  // ── Data state (local/context layer) ──────────────────────────────────────
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});
  const [pools, setPools]                 = useState<Pool[]>(defaultPools);
  const [notes, setNotes]                 = useState<Note[]>(defaultNotes);
  const [chatSessions, setChatSessions]   = useState<ChatSession[]>(defaultSessions);

  // ── Boot: restore session from stored access token ─────────────────────────
  // If a valid token exists, try fetching /api/users/me to verify and load user.
  // On failure (expired token) try refreshing; if that also fails, clear auth.
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = TokenStore.get();

      if (!storedToken) {
        setIsAuthLoading(false);
        return;
      }

      // Attempt to load user details – apiFetch handles the refresh automatically
      const { data, error } = await apiFetch<UserProfile>("/api/users/me");

      if (data && !error) {
        setUser(data);
        setIsAuthenticated(true);
      } else {
        // Token invalid even after refresh attempt – force sign-out
        TokenStore.clear();
        setIsAuthenticated(false);
        setUser(null);
      }

      setIsAuthLoading(false);
    };

    restoreSession();
  }, []);

  // ── Apply dark mode class to <html> whenever the flag changes ─────────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("darkMode", String(isDarkMode));
  }, [isDarkMode]);

  // ── Auth actions ───────────────────────────────────────────────────────────

  /**
   * Called by Auth.tsx after a successful sign-in response.
   * token  – the accessToken returned by the server (already stored in localStorage by Auth.tsx)
   * profile – optional user object from the sign-in response
   */
  const login = useCallback((token?: string, profile?: UserProfile | null) => {
    if (token) TokenStore.set(token);
    setIsAuthenticated(true);

    if (profile) {
      setUser(profile);
    } else {
      // If server didn't return a user object, fetch it now
      apiFetch<UserProfile>("/api/users/me").then(({ data }) => {
        if (data) setUser(data);
      });
    }
  }, []);

  /**
   * Signs the user out:
   *   1. Calls /api/auth/logout (best-effort – we don't block on failure)
   *   2. Clears the local access token
   *   3. Resets all local state
   */
  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors during logout
    }
    TokenStore.clear();
    setIsAuthenticated(false);
    setUser(null);
    setPools(defaultPools);
    setNotes(defaultNotes);
    setChatSessions(defaultSessions);
    setTokenBalances({});
  }, []);

  // ── UI actions ─────────────────────────────────────────────────────────────
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // ── Token helpers ──────────────────────────────────────────────────────────
  const getTokenBalance = useCallback(
    (poolId: string) => tokenBalances[poolId] ?? 0,
    [tokenBalances]
  );

  const getTotalTokens = useCallback(
    () => Object.values(tokenBalances).reduce((sum, t) => sum + t, 0),
    [tokenBalances]
  );

  const spendToken = useCallback(
    (poolId: string) => {
      const balance = tokenBalances[poolId] ?? 0;
      if (balance <= 0) return false;
      setTokenBalances((prev) => ({ ...prev, [poolId]: balance - 1 }));
      return true;
    },
    [tokenBalances]
  );

  // ── Pool helpers (local context layer) ────────────────────────────────────
  // Real creation/joining is done via the API in Pools.tsx; these methods
  // keep the Dashboard and other consumers working with the context data.
  const addPool = useCallback(
    (pool: Omit<Pool, "id" | "memberCount" | "noteCount" | "joinCode">) => {
      const code = pool.name.replace(/\s/g, "").slice(0, 6).toUpperCase();
      const id   = crypto.randomUUID();
      setPools((prev) => [...prev, { ...pool, id, memberCount: 1, noteCount: 0, joinCode: code }]);
      setTokenBalances((prev) => ({ ...prev, [id]: 0 }));
    },
    []
  );

  const joinPool = useCallback(
    (code: string) => {
      const found = pools.find((p) => p.joinCode === code);
      return !!found;
    },
    [pools]
  );

  // ── Note helpers ───────────────────────────────────────────────────────────
  const addNote = useCallback(
    (note: Omit<Note, "id" | "grade" | "tokensEarned" | "createdAt" | "updatedAt">) => {
      const grade       = Math.floor(Math.random() * 20) + 80;
      const tokensEarned = Math.floor(grade / 10);
      const now          = new Date().toISOString();
      setNotes((prev) => [
        ...prev,
        { ...note, id: crypto.randomUUID(), grade, tokensEarned, createdAt: now, updatedAt: now },
      ]);
      setTokenBalances((prev) => ({
        ...prev,
        [note.poolId]: (prev[note.poolId] ?? 0) + tokensEarned,
      }));
      return tokensEarned;
    },
    []
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Chat helpers ───────────────────────────────────────────────────────────
  const addChatSession = useCallback((poolId: string) => {
    const id = crypto.randomUUID();
    setChatSessions((prev) => [
      ...prev,
      { id, poolId, title: "New Chat", messages: [], createdAt: new Date().toISOString() },
    ]);
    return id;
  }, []);

  const addMessageToSession = useCallback(
    (sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
      setChatSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const newMsg     = { ...message, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
          const newMessages = [...s.messages, newMsg];
          const title       =
            s.messages.length === 0 && message.role === "user"
              ? message.content.slice(0, 40)
              : s.title;
          return { ...s, messages: newMessages, title };
        })
      );
    },
    []
  );

  const getSessionsForPool = useCallback(
    (poolId: string) => chatSessions.filter((s) => s.poolId === poolId),
    [chatSessions]
  );

  // ── Provide ────────────────────────────────────────────────────────────────
  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isAuthLoading,
        user,
        isDarkMode,
        tokenBalances,
        pools,
        notes,
        chatSessions,
        login,
        logout,
        toggleDarkMode,
        addPool,
        joinPool,
        addNote,
        deleteNote,
        spendToken,
        getTokenBalance,
        getTotalTokens,
        addChatSession,
        addMessageToSession,
        getSessionsForPool,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
