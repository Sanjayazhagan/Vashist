import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Send, Plus, MessageSquare, PanelLeftClose, PanelLeft,
  ArrowLeft, Coins, Upload, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ── Types ────────────────────────────────────────────────────────────────────
interface ApiPool {
  id: number;
  poolname: string;
}

interface ChatSession {
  id: number;
  title: string;
  poolid: number;   // API returns lowercase
  createdAt?: string;
}

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PoolChat() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate   = useNavigate();

  const [pool, setPool]                       = useState<ApiPool | null>(null);
  const [sessions, setSessions]               = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [input, setInput]                     = useState("");
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [isTyping, setIsTyping]               = useState(false);
  const [loadingHistory, setLoadingHistory]   = useState(false);
  const [tokenBalance, setTokenBalance]       = useState<number>(0);

  const [newChatOpen, setNewChatOpen]   = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load message history for a session ────────────────────────────────────
  // API returns: { history: [{ id, groupid, question, answer }] }
  // Each entry is expanded into two bubbles: user (question) + assistant (answer)
  const loadHistory = useCallback(async (chatId: number) => {
    setLoadingHistory(true);
    const { data, error } = await apiFetch<any>(`/api/chats/${chatId}`);
    if (error) {
      toast.error(`Could not load history: ${error}`);
    } else {
      const raw: any[] = data?.history ?? data?.messages ?? (Array.isArray(data) ? data : []);
      const msgs: ChatMessage[] = raw.flatMap((entry) => {
        if (entry.question !== undefined && entry.answer !== undefined) {
          return [
            { id: entry.id,       role: "user"      as const, content: entry.question },
            { id: entry.id + 0.5, role: "assistant" as const, content: entry.answer   },
          ];
        }
        // Already in role/content shape
        return [entry as ChatMessage];
      });
      setMessages(msgs);
    }
    setLoadingHistory(false);
  }, []);

  // ── Load sessions — defined BEFORE useEffect so init() can call it ────────
  const loadSessions = useCallback(async (): Promise<ChatSession[]> => {
    const { data: chatsData } = await apiFetch<{ chats: ChatSession[] } | ChatSession[]>("/api/chats");
    const all: ChatSession[] = Array.isArray(chatsData)
      ? chatsData
      : (chatsData as any)?.chats ?? [];
    const forPool = all.filter((c) => String(c.poolid) === poolId);
    setSessions(forPool);
    return forPool;
  }, [poolId]);

  // ── Fetch pool info & sessions on mount ───────────────────────────────────
  useEffect(() => {
    if (!poolId) return;

    const init = async () => {
      const { data: poolsData } = await apiFetch<ApiPool[] | { pools: ApiPool[] }>("/api/pools/");
      const poolsArr: ApiPool[] = Array.isArray(poolsData)
        ? poolsData
        : (poolsData as any)?.pools ?? [];
      const found = poolsArr.find((p) => String(p.id) === poolId) ?? null;
      setPool(found);

      const { data: userPoolData } = await apiFetch<any>(`/api/users/me/${poolId}`);
      if (userPoolData?.tokenBalance !== undefined) {
        setTokenBalance(userPoolData.tokenBalance);
      } else if (userPoolData?.tokens !== undefined) {
        setTokenBalance(userPoolData.tokens);
      }

      const forPool = await loadSessions();
      if (forPool.length > 0) {
        setActiveSessionId(forPool[0].id);
        await loadHistory(forPool[0].id);
      }
    };

    init();
  }, [poolId, loadSessions, loadHistory]);

  // ── Switch active session ──────────────────────────────────────────────────
  const handleSelectSession = (id: number) => {
    setActiveSessionId(id);
    setMessages([]);
    loadHistory(id);
  };

  // ── Create new chat ────────────────────────────────────────────────────────
  const handleNewChat = async () => {
    if (!newChatTitle.trim() || !poolId) return;
    setCreatingChat(true);

    const { data, error } = await apiFetch<ChatSession | { chat: ChatSession }>("/api/chats", {
      method: "POST",
      body: JSON.stringify({ poolId: Number(poolId), title: newChatTitle }),
    });

    if (error || !data) {
      toast.error(error || "Could not create chat.");
    } else {
      const session: ChatSession = (data as any)?.chat ?? (data as ChatSession);
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      setNewChatTitle("");
      setNewChatOpen(false);
    }
    setCreatingChat(false);
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || activeSessionId === null) return;
    if (tokenBalance <= 0) {
      toast.error("No tokens remaining. Upload notes to earn more.");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const question = input;
    setInput("");
    setIsTyping(true);
    setTokenBalance((b) => Math.max(b - 1, 0));

    const { data, error } = await apiFetch<any>(`/api/chats/${activeSessionId}/ask`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });

    setIsTyping(false);

    if (error || !data) {
      toast.error(error || "AI failed to respond. Please try again.");
      setTokenBalance((b) => b + 1);
      return;
    }

    const answer: string =
      data?.answer ??
      data?.response ??
      data?.content ??
      data?.message ??
      "I couldn't find an answer in the pool's notes. Please try rephrasing.";

    const assistantMsg: ChatMessage = { role: "assistant", content: answer };
    setMessages((prev) => [...prev, assistantMsg]);
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const canSend = tokenBalance > 0 && input.trim().length > 0 && activeSessionId !== null;

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!poolId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Pool not found. <Link to="/pools" className="text-primary underline">Go back</Link>
      </div>
    );
  }

  const poolName = pool?.poolname ?? `Pool #${poolId}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Chat History Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground truncate">{poolName}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-7 w-7 text-muted-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
              onClick={() => setNewChatOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">No chats yet</p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                  s.id === activeSessionId
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 inline mr-2" />
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-12 flex items-center gap-2 px-4 border-b border-border bg-background shrink-0">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-7 w-7 text-muted-foreground"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/pools")}
            className="h-7 w-7 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">{poolName} — AI Chat</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {loadingHistory && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading history…</span>
            </div>
          )}

          {!loadingHistory && (!activeSessionId || messages.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground">
                Start a conversation
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Ask anything about the notes shared in {poolName}. Each question costs 1 token.
              </p>
              {!activeSessionId && (
                <Button className="mt-4 gap-2" onClick={() => setNewChatOpen(true)}>
                  <Plus className="h-4 w-4" /> New Chat
                </Button>
              )}
            </div>
          )}

          {!loadingHistory &&
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background shrink-0">
          {tokenBalance > 0 ? (
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Coins className="h-3 w-3" /> Cost: 1 token per question · Balance:{" "}
              <strong>{tokenBalance}</strong>
            </p>
          ) : (
            <p className="text-xs text-destructive mb-2 flex items-center gap-1">
              <Coins className="h-3 w-3" /> No tokens remaining.{" "}
              <Link to="/notes" className="underline flex items-center gap-1">
                <Upload className="h-3 w-3" /> Upload notes to earn tokens
              </Link>
            </p>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder={tokenBalance > 0 ? "Ask a question…" : "Upload notes to earn tokens"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={tokenBalance === 0 || !activeSessionId}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!canSend || isTyping}
              size="icon"
              className="shrink-0 h-11 w-11"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Chat Title</Label>
            <Input
              placeholder="e.g. DBMS Doubts"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleNewChat(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChatOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewChat} disabled={creatingChat || !newChatTitle.trim()}>
              {creatingChat ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
