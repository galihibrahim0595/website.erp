import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Building2, Bell, Shield, Plug, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { useAuth, getAuthHeaders } from "@/lib/auth.tsx";

const ROLES = ["Owner", "Admin", "Packing", "Viewer"] as const;

type Role = (typeof ROLES)[number];

type UserRow = {
  id: number;
  username: string;
  email: string;
  role: Role;
  enabled: boolean;
  created_at: string;
};

export const Route = createFileRoute("/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — NovaOMS" }] }),
  component: PengaturanPage,
});

function PengaturanPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";
  const menu = [
    { icon: User, label: "Profil", active: true },
    { icon: Building2, label: "Perusahaan" },
    { icon: Plug, label: "Integrasi" },
    { icon: Bell, label: "Notifikasi" },
    { icon: Shield, label: "Keamanan" },
  ];

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formState, setFormState] = useState({
    username: "",
    email: "",
    password: "",
    role: "Admin" as Role,
    enabled: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOwner) {
      return;
    }

    const abortController = new AbortController();

    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const response = await fetch("/api/users", {
          signal: abortController.signal,
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Gagal memuat daftar pengguna");
        }
        const payload = (await response.json()) as { users: UserRow[] };
        setUsers(payload.users);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error(error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => abortController.abort();
  }, [isOwner]);

  const activeUserCount = useMemo(() => users.filter((item) => item.enabled).length, [users]);

  function openCreateUserDialog() {
    setEditingUser(null);
    setFormState({ username: "", email: "", password: "", role: "Admin", enabled: true });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditUserDialog(userToEdit: UserRow) {
    setEditingUser(userToEdit);
    setFormState({
      username: userToEdit.username,
      email: userToEdit.email,
      password: "",
      role: userToEdit.role,
      enabled: userToEdit.enabled,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSaveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      username: formState.username.trim(),
      email: formState.email.trim(),
      role: formState.role,
      enabled: formState.enabled,
    };

    if (!editingUser || formState.password.length > 0) {
      payload.password = formState.password;
    }

    if (!payload.username || !payload.email || !payload.role) {
      setFormError("Lengkapi semua data pengguna terlebih dahulu.");
      setSubmitting(false);
      return;
    }

    if (!editingUser && !formState.password) {
      setFormError("Password diperlukan untuk pengguna baru.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(editingUser ? `/api/users/${editingUser.id}` : "/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error ?? "Gagal menyimpan pengguna");
      }

      const savedUser = await response.json();
      if (savedUser?.user) {
        await refreshUsers();
        setDialogOpen(false);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan pengguna");
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshUsers() {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users', { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error('Gagal memuat daftar pengguna');
      }
      const payload = (await response.json()) as { users: UserRow[] };
      setUsers(payload.users);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleDeleteUser(userToDelete: UserRow) {
    if (!window.confirm(`Hapus pengguna ${userToDelete.username}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error ?? "Gagal menghapus pengguna");
      }
      await refreshUsers();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Pengaturan" subtitle="Konfigurasi akun dan sistem" />
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <Card className="p-2">
          <nav className="flex md:flex-col gap-1">
            {menu.map((m) => (
              <button
                key={m.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                  m.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <m.icon className="h-4 w-4" /> {m.label}
              </button>
            ))}
          </nav>
        </Card>
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold">Profil Pengguna</h2>
            <p className="text-xs text-muted-foreground">Kelola informasi akun Anda</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input defaultValue="Nova Admin" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input defaultValue="admin@novaoms.id" />
            </div>
            <div className="space-y-1.5">
              <Label>Telepon</Label>
              <Input defaultValue="08123456789" />
            </div>
            <div className="space-y-1.5">
              <Label>Jabatan</Label>
              <Input defaultValue="Owner" />
            </div>
          </div>
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Notifikasi Email</div>
                <div className="text-xs text-muted-foreground">Kirim ringkasan harian</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Two-Factor Authentication</div>
                <div className="text-xs text-muted-foreground">Keamanan tambahan saat login</div>
              </div>
              <Switch />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Batal</Button>
            <Button>Simpan Perubahan</Button>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Kelola Pengguna</h2>
                <p className="text-xs text-muted-foreground">
                  Hanya Owner dapat membuat, mengedit, menonaktifkan, dan menghapus pengguna.
                </p>
              </div>
              {isOwner ? (
                <Button onClick={openCreateUserDialog} className="inline-flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Tambah Pengguna
                </Button>
              ) : null}
            </div>

            {isOwner ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Total pengguna: {users.length}</span>
                  <span>Aktif: {activeUserCount}</span>
                </div>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3">Username</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Role</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">
                            Memuat pengguna...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">
                            Belum ada pengguna.
                          </td>
                        </tr>
                      ) : (
                        users.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-3 font-medium">{item.username}</td>
                            <td className="px-3 py-3 text-muted-foreground">{item.email}</td>
                            <td className="px-3 py-3">{item.role}</td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {item.enabled ? "Aktif" : "Nonaktif"}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditUserDialog(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(item)}
                                disabled={item.id === user?.id}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                Akses pengelolaan pengguna hanya tersedia untuk akun dengan peran Owner.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Perbarui informasi pengguna dan role." : "Buat pengguna baru untuk sistem NovaOMS."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveUser}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formState.username}
                  onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      role: event.target.value as Role,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enabled">Status Aktif</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enabled"
                    checked={formState.enabled}
                    onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, enabled: Boolean(checked) }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formState.enabled ? "Diaktifkan" : "Dinonaktifkan"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password {editingUser ? "(kosongkan untuk tidak mengubah)" : ""}</Label>
              <Input
                id="password"
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : editingUser ? "Simpan Perubahan" : "Tambah Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
