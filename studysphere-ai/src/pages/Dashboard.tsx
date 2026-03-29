import { useEffect, useState } from "react";
import { Users, FileText, MessageSquare, TrendingUp, Clock, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api"; // ← shared utility

// ── Types for API responses ──────────────────────────────────────────────────
interface UserDetails {
  id: number;
  email: string;
  name?: string;
  tokenBalance?: number;
}

interface ApiPool {
  id: number;
  poolname: string;
  pooldescription?: string;
  joincode?: string;
  memberCount?: number;
  noteCount?: number;
}

interface ApiNote {
  id: number;
  name: string;
  poolId: number;
  createdAt?: string;
  grade?: number;
  tokensEarned?: number;
}

interface ApiChat {
  id: number;
  title: string;
  poolId: number;
  createdAt?: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { pools: ctxPools, notes: ctxNotes, chatSessions: ctxChats } = useApp();
  const navigate = useNavigate();

  // Live data fetched from the API (falls back to context if API unavailable)
  const [user, setUser]       = useState<UserDetails | null>(null);
  const [apiPools, setApiPools] = useState<ApiPool[]>([]);
  const [apiNotes, setApiNotes] = useState<ApiNote[]>([]);
  const [apiChats, setApiChats] = useState<ApiChat[]>([]);
  const [loading, setLoading]   = useState(true);

  // ── Fetch everything on mount ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. User details
      const { data: userData } = await apiFetch<UserDetails>("/api/users/me");
      if (userData) setUser(userData);

      // 2. User's pools
      const { data: poolsData } = await apiFetch<ApiPool[] | { pools: ApiPool[] }>("/api/pools/");
      const poolsArr = Array.isArray(poolsData)
        ? poolsData
        : (poolsData as any)?.pools ?? [];
      setApiPools(poolsArr);

      // 3. Notes – fetch for each pool in parallel
      if (poolsArr.length > 0) {
        const noteResults = await Promise.all(
          poolsArr.map((p) => apiFetch<ApiNote[] | { notes: ApiNote[] }>(`/api/notes/${p.id}`))
        );
        const allNotes = noteResults.flatMap(({ data }) =>
          Array.isArray(data) ? data : (data as any)?.notes ?? []
        );
        setApiNotes(allNotes);
      }

      // 4. Chats
      const { data: chatsData } = await apiFetch<ApiChat[] | { chats: ApiChat[] }>("/api/chats");
      const chatsArr = Array.isArray(chatsData)
        ? chatsData
        : (chatsData as any)?.chats ?? [];
      setApiChats(chatsArr);

      setLoading(false);
    };

    load();
  }, []);

  // Prefer API data; fall back to context data when API is unavailable
  const pools = apiPools.length > 0 ? apiPools : ctxPools;
  const notes = apiNotes.length > 0 ? apiNotes : ctxNotes;
  const chats = apiChats.length > 0 ? apiChats : ctxChats;

  // ── Derived metrics ────────────────────────────────────────────────────────
  const metrics = [
    {
      label: "Active Pools",
      value: pools.length,
      icon: Users,
      accent: "bg-primary/10 text-primary",
      onClick: () => navigate("/pools"),
    },
    {
      label: "Notes Uploaded",
      value: notes.length,
      icon: FileText,
      accent: "bg-success/10 text-success",
      onClick: () => navigate("/notes"),
    },
  ];

  // Build a unified activity feed from notes + chats
  const recentActivity = [
    ...apiNotes.slice(-3).map((n) => ({
      type: "note" as const,
      title: `Uploaded "${n.name}"`,
      sub: `Pool #${n.poolId}`,
      time: n.createdAt ?? new Date().toISOString(),
      icon: FileText,
    })),
    ...apiChats.slice(-2).map((s) => ({
      type: "chat" as const,
      title: `Chat: "${s.title}"`,
      sub: `Pool #${s.poolId}`,
      time: s.createdAt ?? new Date().toISOString(),
      icon: MessageSquare,
    })),
    // Fallback to context data if API returned nothing
    ...(apiNotes.length === 0 && apiChats.length === 0
      ? [
          ...ctxNotes.slice(-3).map((n) => ({
            type: "note" as const,
            title: `Uploaded "${n.title}"`,
            sub: n.poolName,
            time: n.createdAt,
            icon: FileText,
          })),
          ...ctxChats.slice(-2).map((s) => ({
            type: "chat" as const,
            title: `Chat: "${s.title}"`,
            sub: ctxPools.find((p) => p.id === s.poolId)?.name ?? "",
            time: s.createdAt,
            icon: MessageSquare,
          })),
        ]
      : []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Average note grade (API notes may not have grade; fall back to context)
  const gradeSource = apiNotes.length > 0 ? apiNotes : ctxNotes;
  const avgGrade =
    gradeSource.length > 0
      ? Math.round(
          gradeSource.reduce((acc, n) => acc + ((n as any).grade ?? 0), 0) /
            gradeSource.length
        )
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {user ? `Welcome back, ${user.name ?? user.email}!` : "Welcome back!"}{" "}
          Here's your study overview.
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your data…
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className="glass-surface hover:shadow-md transition-shadow cursor-pointer"
            onClick={m.onClick}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${m.accent}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className="text-sm text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="glass-surface">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No activity yet. Start by joining a pool!
              </p>
            ) : (
              recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === "note"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/20 text-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="glass-surface">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground">Total AI Chats</p>
              <p className="text-3xl font-bold text-foreground mt-1">{chats.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground">Average Note Grade</p>
              <p className="text-3xl font-bold text-foreground mt-1">{avgGrade}%</p>
            </div>
            {user?.tokenBalance !== undefined && (
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">Token Balance</p>
                <p className="text-3xl font-bold text-foreground mt-1">{user.tokenBalance}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
