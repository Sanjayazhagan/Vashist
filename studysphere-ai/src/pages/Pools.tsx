import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LogIn, Users, FileText, Copy, Coins, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api"; // ← shared utility

// ── Types ────────────────────────────────────────────────────────────────────
interface Pool {
  id: number;
  poolname: string;
  pooldescription?: string;
  joincode?: string;
  memberCount?: number;
  noteCount?: number;
  tokenBalance?: number;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Pools() {
  const navigate = useNavigate();
  const [pools, setPools]           = useState<Pool[]>([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [joinCode, setJoinCode]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch pools on mount ───────────────────────────────────────────────────
  const fetchPools = async () => {
    setLoading(true);
    const { data, error } = await apiFetch<Pool[] | { pools: Pool[] }>("/api/pools/");

    if (error) {
      toast.error(`Could not load pools: ${error}`);
    } else {
      const arr = Array.isArray(data) ? data : (data as any)?.pools ?? [];
      setPools(arr);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPools(); }, []);

  // ── Create Pool ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);

    const { data, error } = await apiFetch<Pool>("/api/pools/", {
      method: "POST",
      body: JSON.stringify({ poolname: newName, pooldescription: newDesc }),
    });

    if (error || !data) {
      toast.error(error || "Failed to create pool.");
    } else {
      toast.success(`Pool "${newName}" created!`);
      setPools((prev) => [...prev, data]);
      setNewName("");
      setNewDesc("");
      setCreateOpen(false);
    }
    setSubmitting(false);
  };

  // ── Join Pool ──────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setSubmitting(true);

    const { data, error } = await apiFetch<Pool | { pool: Pool }>("/api/pools/join", {
      method: "POST",
      body: JSON.stringify({ joincode: joinCode }),
    });

    if (error || !data) {
      toast.error(error || "Invalid join code. Please try again.");
    } else {
      const pool: Pool = (data as any)?.pool ?? (data as Pool);
      toast.success("Joined pool successfully!");
      setPools((prev) =>
        prev.find((p) => p.id === pool.id) ? prev : [...prev, pool]
      );
      setJoinCode("");
      setJoinOpen(false);
    }
    setSubmitting(false);
  };

  // ── Copy join code to clipboard ────────────────────────────────────────────
  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => toast.success("Join code copied!"));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Pools</h1>
          <p className="text-muted-foreground mt-1">Your study groups and communities</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchPools}
            disabled={loading}
            title="Refresh pools"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={() => setJoinOpen(true)} className="gap-2">
            <LogIn className="h-4 w-4" /> Join Pool
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Pool
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading pools…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && pools.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No pools yet</p>
          <p className="text-sm mt-1">Create a pool or join one with a code.</p>
        </div>
      )}

      {/* Pool grid */}
      {!loading && pools.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => (
            <Card
              key={pool.id}
              className="glass-surface hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/pool/${pool.id}/chat`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                    {pool.poolname}
                  </h3>
                  {pool.joincode && (
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
                      onClick={(e) => handleCopyCode(e, pool.joincode!)}
                      title="Copy join code"
                    >
                      <Copy className="h-3 w-3" />
                      {pool.joincode}
                    </button>
                  )}
                </div>

                {pool.pooldescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {pool.pooldescription}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  {pool.memberCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {pool.memberCount} members
                    </span>
                  )}
                  {pool.noteCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {pool.noteCount} notes
                    </span>
                  )}
                  {pool.tokenBalance !== undefined && (
                    <span className="flex items-center gap-1 token-gradient text-token-foreground px-1.5 py-0.5 rounded-full font-medium">
                      <Coins className="h-3 w-3" />
                      {pool.tokenBalance} tokens
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pool Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Pool</DialogTitle>
            <DialogDescription>Start a study group and invite your peers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Pool Name</Label>
              <Input
                placeholder="e.g. Organic Chemistry"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What's this pool about?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !newName.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Pool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Pool Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Pool</DialogTitle>
            <DialogDescription>Enter the join code shared by your study group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Join Code</Label>
              <Input
                placeholder="e.g. OCHEM26"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              By joining, you agree to share your uploaded notes with pool members.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={submitting || !joinCode.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Join Pool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
