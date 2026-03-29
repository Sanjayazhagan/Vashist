import { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Trash2, Download, Coins, CheckCircle, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch, TokenStore } from "@/lib/api"; // ← shared utility

// ── Types ────────────────────────────────────────────────────────────────────
interface ApiPool {
  id: number;
  poolname: string;
}

interface ApiNote {
  id: number;
  name: string;
  poolId: number;
  poolName?: string;
  grade?: number;
  tokensEarned?: number;
  fileUrl?: string;
  createdAt?: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Notes() {
  const [pools, setPools]         = useState<ApiPool[]>([]);
  const [notes, setNotes]         = useState<ApiNote[]>([]);
  const [selectedPool, setSelectedPool] = useState("");
  const [noteName, setNoteName]   = useState("");
  const [file, setFile]           = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // BASE_URL for downloads
  const BASE_URL = (
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PUBLIC_BACKEND_BASE_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.NEXT_PUBLIC_BACKEND_BASE_URL || process.env?.PUBLIC_BACKEND_BASE_URL)) ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  // ── Fetch pools on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const loadPools = async () => {
      const { data } = await apiFetch<ApiPool[] | { pools: ApiPool[] }>("/api/pools/");
      const arr = Array.isArray(data) ? data : (data as any)?.pools ?? [];
      setPools(arr);
    };
    loadPools();
  }, []);

  // ── Fetch notes when selected pool changes ─────────────────────────────────
  const fetchNotesForPool = async (poolId: string) => {
    if (!poolId) return;
    setLoadingNotes(true);
    const { data, error } = await apiFetch<ApiNote[] | { notes: ApiNote[] }>(`/api/notes/${poolId}`);
    if (error) {
      toast.error(`Could not load notes: ${error}`);
    } else {
      const arr = Array.isArray(data) ? data : (data as any)?.notes ?? [];
      // Merge with existing notes from other pools
      setNotes((prev) => {
        const otherPools = prev.filter((n) => String(n.poolId) !== poolId);
        return [...otherPools, ...arr];
      });
    }
    setLoadingNotes(false);
  };

  // Load notes for all pools on mount
  useEffect(() => {
    const loadAll = async () => {
      setLoadingNotes(true);
      const { data: poolsData } = await apiFetch<ApiPool[] | { pools: ApiPool[] }>("/api/pools/");
      const poolsArr: ApiPool[] = Array.isArray(poolsData)
        ? poolsData
        : (poolsData as any)?.pools ?? [];

      if (poolsArr.length === 0) { setLoadingNotes(false); return; }

      const results = await Promise.all(
        poolsArr.map((p) =>
          apiFetch<ApiNote[] | { notes: ApiNote[] }>(`/api/notes/${p.id}`).then(({ data }) => {
            const arr: ApiNote[] = Array.isArray(data) ? data : (data as any)?.notes ?? [];
            return arr.map((n) => ({
              ...n,
              poolName: n.poolName ?? poolsArr.find((pp) => pp.id === p.id)?.poolname,
            }));
          })
        )
      );
      setNotes(results.flat());
      setLoadingNotes(false);
    };
    loadAll();
  }, []);

  // ── File selection helpers ─────────────────────────────────────────────────
  const handleFileSelect = (selected: File) => {
    setFile(selected);
    if (!noteName) setNoteName(selected.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  // ── Upload Note ────────────────────────────────────────────────────────────
  // API expects multipart/form-data: { file, poolId, name }
  const handleUpload = async () => {
    if (!noteName.trim() || !selectedPool) {
      toast.error("Please fill in a title and select a pool.");
      return;
    }
    if (!file) {
      toast.error("Please attach a file to upload.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("poolId", selectedPool);
    formData.append("name", noteName);

    const token = TokenStore.get();

    try {
      const res = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData, // Don't set Content-Type; browser adds multipart boundary
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || `Upload failed (${res.status})`);
      }

      const note: ApiNote = (data as any)?.note ?? data;
      const poolName = pools.find((p) => String(p.id) === selectedPool)?.poolname ?? "";

      setNotes((prev) => [...prev, { ...note, poolName }]);

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium">Note uploaded successfully!</p>
            {note.tokensEarned && (
              <p className="text-sm text-muted-foreground">
                You earned <strong>{note.tokensEarned} tokens</strong> 🎉
              </p>
            )}
            {note.grade && (
              <p className="text-sm text-muted-foreground">Grade: {note.grade}%</p>
            )}
          </div>
        </div>
      );

      setNoteName("");
      setFile(null);
      setSelectedPool("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Download note file ─────────────────────────────────────────────────────
  const handleDownload = (note: ApiNote) => {
    if (note.fileUrl) {
      window.open(`${BASE_URL}${note.fileUrl}`, "_blank");
    } else {
      toast.info("No downloadable file attached to this note.");
    }
  };

  // ── Delete note (local removal; no delete endpoint in the API) ─────────────
  const handleDelete = (id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast("Note removed.");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">My Notes</h1>
        <p className="text-muted-foreground mt-1">
          Upload notes, earn tokens, and manage your library
        </p>
      </div>

      {/* ── Upload Section ───────────────────────────────────────────────── */}
      <Card className="glass-surface">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Upload New Note
          </h2>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            {file ? (
              <p className="text-sm font-medium text-foreground">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drag & drop your file here, or <span className="text-primary underline">browse</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD supported</p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Note Title</Label>
              <Input
                placeholder="e.g. Chapter 5 Summary"
                value={noteName}
                onChange={(e) => setNoteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Target Pool</Label>
              <Select
                value={selectedPool}
                onValueChange={(v) => { setSelectedPool(v); fetchNotesForPool(v); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pool" />
                </SelectTrigger>
                <SelectContent>
                  {pools.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.poolname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              AI will grade your note and award tokens based on quality
            </p>
            <Button onClick={handleUpload} disabled={uploading} className="gap-2">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload & Grade"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes Library ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-lg">Your Notes Library</h2>
          {loadingNotes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading…
            </span>
          )}
        </div>

        {notes.length === 0 && !loadingNotes ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No notes yet. Upload your first note above!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((note) => (
              <Card key={note.id} className="glass-surface">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{note.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {note.poolName ?? `Pool #${note.poolId}`}
                      </p>
                    </div>
                    {note.tokensEarned !== undefined && (
                      <div className="flex items-center gap-1 text-xs font-medium token-gradient text-token-foreground px-2 py-1 rounded-full">
                        <Coins className="h-3 w-3" />+{note.tokensEarned}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {note.grade !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        Grade: {note.grade}%
                      </span>
                    )}
                    <div className="flex gap-1 ml-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDownload(note)}
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
