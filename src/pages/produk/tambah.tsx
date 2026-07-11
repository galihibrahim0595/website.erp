import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, UploadCloud, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/AppLayout";

const STORE_OPTIONS = ["Toko Utama", "Toko Jakarta", "Toko Surabaya"];
const CATEGORY_OPTIONS = ["Pakaian", "Elektronik", "Kecantikan", "Rumah Tangga"];
const CONDITION_OPTIONS = ["Baru", "Bekas", "Refurbished"];

type VariationCombination = {
  label: string;
  values: string[];
};

function TambahProdukPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [store, setStore] = useState(STORE_OPTIONS[0]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [stock, setStock] = useState("");
  const [weight, setWeight] = useState("");
  const [packageLength, setPackageLength] = useState("");
  const [packageWidth, setPackageWidth] = useState("");
  const [packageHeight, setPackageHeight] = useState("");
  const [preorder, setPreorder] = useState(false);
  const [condition, setCondition] = useState(CONDITION_OPTIONS[0]);

  const variationCombinations = useMemo<VariationCombination[]>(() => {
    const colors = ["Hitam", "Putih", "Abu"];
    const sizes = ["M", "L", "XL"];
    return colors.flatMap((color) => sizes.map((size) => ({ label: `${color} - ${size}`, values: [color, size] })));
  }, []);

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...next].slice(0, 9));
  };

  const handleVideoFile = (file: File | null) => {
    if (!file) return;
    setVideo(URL.createObjectURL(file));
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tambah Produk"
        subtitle="Isi data produk untuk ditambahkan ke katalog."
        actions={
          <Link to="/produk" className="inline-flex">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" /> Kembali
            </Button>
          </Link>
        }
      />

      <form className="space-y-6">
        <Card className="p-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label>Toko</Label>
              <select
                value={store}
                onChange={(event) => setStore(event.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {STORE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label>Nama Produk</Label>
              <Input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Masukkan nama produk"
              />
            </div>
            <div className="grid gap-2 lg:col-span-3">
              <Label>Kategori</Label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Pilih kategori</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Foto Produk</Label>
                <span className="text-xs text-muted-foreground">Maks. 9 foto</span>
              </div>
              <div
                className="rounded-3xl border border-dashed border-border bg-background p-4 text-center transition hover:border-primary/80"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/60 text-primary">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <p className="mt-3 text-sm text-foreground">Klik untuk unggah foto produk</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleImageFiles(event.target.files)}
                />
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((src, index) => (
                    <div key={`${src}-${index}`} className="overflow-hidden rounded-3xl border border-border bg-muted">
                      <img src={src} alt={`Foto ${index + 1}`} className="h-24 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Video Produk</Label>
                <span className="text-xs text-muted-foreground">Maks. 1 video</span>
              </div>
              <div
                className="rounded-3xl border border-dashed border-border bg-background p-4 text-center transition hover:border-primary/80"
                onClick={() => videoInputRef.current?.click()}
              >
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/60 text-primary">
                  <Video className="h-8 w-8" />
                </div>
                <p className="mt-3 text-sm text-foreground">Klik untuk unggah video produk</p>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => handleVideoFile(event.target.files?.[0] ?? null)}
                />
              </div>
              {video && (
                <div className="rounded-3xl border border-border bg-muted p-2">
                  <video controls src={video} className="w-full rounded-2xl" />
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label>SKU Induk</Label>
              <Input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Masukkan SKU induk" />
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi Produk</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Masukkan deskripsi produk"
                className="min-h-[160px]"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Variasi</div>
              <p className="text-xs text-muted-foreground">Default berisi variasi Warna dan Ukuran.</p>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col sm:grid-cols-2">
              <Button variant="secondary" size="sm" type="button" disabled>
                Berbagai Variasi
              </Button>
              <Button variant="outline" size="sm" type="button" disabled>
                Satu Variasi
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="text-sm font-semibold">Warna</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Hitam', 'Putih', 'Abu'].map((color) => (
                  <span key={color} className="rounded-full border border-border bg-muted px-3 py-1 text-xs">{color}</span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="text-sm font-semibold">Ukuran</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['M', 'L', 'XL'].map((size) => (
                  <span key={size} className="rounded-full border border-border bg-muted px-3 py-1 text-xs">{size}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border bg-background">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Kombinasi</th>
                  <th className="px-3 py-3">Harga</th>
                  <th className="px-3 py-3">Stok</th>
                </tr>
              </thead>
              <tbody>
                {variationCombinations.map((combo) => (
                  <tr key={combo.label} className="border-t border-border">
                    <td className="px-3 py-3">{combo.label}</td>
                    <td className="px-3 py-3">-</td>
                    <td className="px-3 py-3">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label>Harga</Label>
              <Input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-2">
              <Label>Harga Promo</Label>
              <Input value={promoPrice} onChange={(event) => setPromoPrice(event.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-2">
              <Label>Stok</Label>
              <Input value={stock} onChange={(event) => setStock(event.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-2">
              <Label>Berat (gram)</Label>
              <Input value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="0" />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label>Panjang Paket (cm)</Label>
              <Input value={packageLength} onChange={(event) => setPackageLength(event.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-2">
              <Label>Lebar Paket (cm)</Label>
              <Input value={packageWidth} onChange={(event) => setPackageWidth(event.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-2">
              <Label>Tinggi Paket (cm)</Label>
              <Input value={packageHeight} onChange={(event) => setPackageHeight(event.target.value)} placeholder="0" />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label>Kondisi</Label>
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="mb-0">Pre-order</Label>
                <Switch checked={preorder} onCheckedChange={setPreorder} />
              </div>
              {preorder && (
                <Input value="Sedang preorder" readOnly />
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link to="/produk" className="inline-flex">
            <Button variant="outline" size="sm">Batal</Button>
          </Link>
          <Button type="submit">Simpan Produk</Button>
        </div>
      </form>
    </div>
  );
}

export default TambahProdukPage;
