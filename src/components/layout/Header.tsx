import { Bell, Search, Menu, HelpCircle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LogoutButton } from "./Logout";
import { useAuth } from "@/lib/auth.tsx";

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4 shrink-0">
      <button
        onClick={onToggleSidebar}
        className="grid h-9 w-9 place-items-center rounded-md hover:bg-accent text-muted-foreground"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari pesanan, produk, SKU..."
          className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-card"
        />
      </div>

      <div className="flex-1" />

      <button className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent">
        <HelpCircle className="h-4 w-4" /> Bantuan
      </button>

      <button className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-accent text-muted-foreground">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
      </button>

      <div className="h-8 w-px bg-border mx-1" />

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {user?.username?.charAt(0).toUpperCase() ?? "N"}
          </div>
          <div className="hidden sm:block text-left min-w-0">
            <div className="text-xs font-semibold leading-tight truncate">{user?.username ?? "Nova Admin"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{user?.email ?? "admin@novaoms.id"}</div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
