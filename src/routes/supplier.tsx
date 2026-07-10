import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { suppliers } from "@/services/data";

export const Route = createFileRoute("/supplier")({
  head: () => ({ meta: [{ title: "Supplier — NovaOMS" }] }),
  component: SupplierPage,
});

function SupplierPage() {
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Supplier" subtitle="Daftar mitra supplier" actions={
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> Tambah Supplier</Button>
      } />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <Card key={s.id} className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary font-bold">
                {s.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">{s.contact} · {s.phone}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">{s.address}</div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">Detail</Button>
              <Button size="sm" variant="outline" className="flex-1">Buat PO</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
