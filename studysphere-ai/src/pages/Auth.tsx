import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch, TokenStore } from "@/lib/api"; // ← shared utility

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");

  const { login } = useApp();

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (isLogin) {
      // ── Sign In ─────────────────────────────────────────────────────────────
      const { data, error: apiError } = await apiFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (apiError || !data) {
        setError(apiError || "Sign-in failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Server may return the token under different keys – handle all variants
      const token: string =
        data.accessToken ?? data.access_token ?? data.token ?? "";

      if (token) TokenStore.set(token);

      // Pass token (and optional user info) to app context
      login(token, data.user ?? null);

    } else {
      // ── Sign Up ─────────────────────────────────────────────────────────────
      // Note: Postman collection only sends { email, password } for signup.
      // `name` is included here; the server may silently ignore it if unsupported.
      const { error: apiError } = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      if (apiError) {
        setError(apiError);
        setIsLoading(false);
        return;
      }

      // Signup succeeded – prompt user to verify email and switch to login tab
      alert(
        "Account created successfully! Please check your email to verify your account, then sign in."
      );
      setIsLogin(true);
      setPassword("");
    }

    setIsLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary-foreground blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
            <h1 className="font-display text-3xl font-bold text-primary-foreground tracking-tight">
              PoolNotes
            </h1>
          </div>
          <p className="text-primary-foreground/70 text-sm">AI-Powered Study Platform</p>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
              Study smarter,
              <br />
              together.
            </h2>
            <p className="text-primary-foreground/80 mt-4 text-lg max-w-md leading-relaxed">
              Share notes, earn tokens, and chat with AI about your collective
              knowledge. Learning is better in a pool.
            </p>
          </div>
          <div className="flex gap-6 text-primary-foreground/60 text-sm">
            <div>
              <span className="block text-2xl font-bold text-primary-foreground">10k+</span>Students
            </div>
            <div>
              <span className="block text-2xl font-bold text-primary-foreground">50k+</span>Notes Shared
            </div>
            <div>
              <span className="block text-2xl font-bold text-primary-foreground">1M+</span>AI Chats
            </div>
          </div>
        </div>
        <div className="relative z-10 text-primary-foreground/40 text-xs">
          © 2026 PoolNotes. All rights reserved.
        </div>
      </div>

      {/* Right Panel – Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">PoolNotes</span>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin ? "Sign in to continue learning" : "Start your study journey today"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error banner */}
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Alex Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-medium gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
