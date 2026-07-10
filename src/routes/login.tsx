import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth.tsx";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — NovaOMS" },
      { name: "description", content: "Login ke NovaOMS untuk mengelola produk, pesanan, dan gudang." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/", replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username.trim() || "admin", password, remember);
      navigate({ to: "/", replace: true });
    } catch {
      setError("Login gagal. Periksa username dan password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 px-8 py-10 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary shadow-md shadow-primary/10">
            <Sparkles className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">NovaOMS</h1>
            <p className="mt-1 text-sm text-muted-foreground">Omnichannel ERP modern untuk bisnis Anda.</p>
          </div>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Nama Pengguna</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="nama.pengguna"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(Boolean(checked))}
              />
              <span>Ingat saya</span>
            </label>
            <a className="text-sm font-medium text-primary hover:text-primary/80" href="#">
              Lupa kata sandi?
            </a>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full py-3 text-base font-semibold" disabled={submitting}>
            {submitting ? "Memuat..." : "Masuk"}
          </Button>
        </form>

        <div className="mt-8 rounded-3xl border border-white/5 bg-white/5 p-4 text-center text-sm text-muted-foreground">
          Belum punya akun? Hubungi administrator untuk mendapatkan akses.
        </div>
      </div>
    </div>
  );
}
