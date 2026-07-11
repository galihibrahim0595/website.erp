import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, ImagePlus, UploadCloud, GripVertical, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AddProductSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ImageItem = {
  id: string;
  file: File;
  url: string;
};

type VariationGroup = {
  id: string;
  name: string;
  values: string[];
  valueInput: string;
};

type VariantInput = {
  sku: string;
  price: string;
  stock: string;
  barcode: string;
};

const STORE_OPTIONS = ["Toko Utama", "Toko Jakarta", "Toko Surabaya"];
const CATEGORY_OPTIONS = ["Pakaian", "Elektronik", "Kecantikan", "Rumah Tangga"];
const SHIPPING_SERVICES = [
  { key: "jne", label: "JNE" },
  { key: "jnt", label: "JNT" },
  { key: "sicepat", label: "SiCepat" },
  { key: "anteraja", label: "Anteraja" },
  { key: "ninja", label: "Ninja Xpress" },
  { key: "pos", label: "POS" },
];
const CONDITION_OPTIONS = ["Baru", "Bekas", "Refurbished"];
const MAX_PHOTOS = 9;

const randomId = () => `id-${Math.random().toString(36).slice(2, 10)}`;

export function AddProductSheet({ open, onOpenChange }: AddProductSheetProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [store, setStore] = useState(STORE_OPTIONS[0]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [masterSku, setMasterSku] = useState("");
  const [description, setDescription] = useState("");
  const [saleMode, setSaleMode] = useState<"single" | "multi">("multi");
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([
    { id: "var-1", name: "Warna", values: ["Hitam", "Putih"], valueInput: "" },
    { id: "var-2", name: "Ukuran", values: ["M", "L", "XL"], valueInput: "" },
  ]);
  const [variantInputs, setVariantInputs] = useState<Record<string, VariantInput>>({});
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [selectedCouriers, setSelectedCouriers] = useState<Record<string, boolean>>({});
  const [condition, setCondition] = useState(CONDITION_OPTIONS[0]);
  const [preorder, setPreorder] = useState(false);
  const [preorderNote, setPreorderNote] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [images]);

  const handleFiles = (files: FileList | File[]) => {
    const items = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, MAX_PHOTOS - images.length)
      .map((file) => ({ id: randomId(), file, url: URL.createObjectURL(file) }));

    if (items.length > 0) {
      setImages((prev) => [...prev, ...items]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
      event.target.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const removed = prev.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleVariationChange = (id: string, key: keyof VariationGroup, value: string) => {
    setVariationGroups((prev) => prev.map((group) => (group.id === id ? { ...group, [key]: value } : group)));
  };

  const addVariationValue = (groupId: string) => {
    setVariationGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        const nextValue = group.valueInput.trim();
        if (!nextValue) return group;
        if (group.values.includes(nextValue)) return { ...group, valueInput: "" };
        return { ...group, values: [...group.values, nextValue], valueInput: "" };
      }),
    );
  };

  const removeVariationValue = (groupId: string, value: string) => {
    setVariationGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, values: group.values.filter((item) => item !== value) }
          : group,
      ),
    );
  };

  const addVariationGroup = () => {
    if (variationGroups.length >= 2) return;
    setVariationGroups((prev) => [...prev, { id: randomId(), name: "Variasi Baru", values: [], valueInput: "" }]);
  };

  const removeVariationGroup = (groupId: string) => {
    setVariationGroups((prev) => prev.filter((group) => group.id !== groupId));
  };

  const variationLabels = useMemo(() => {
    if (saleMode === "single") {
      return [{ label: "Produk Tunggal" }];
    }

    const activeGroups = variationGroups.filter((group) => group.name.trim() && group.values.length > 0);
    if (activeGroups.length === 0) {
      return [];
    }

    if (activeGroups.length === 1) {
      return activeGroups[0].values.map((value) => ({ label: value }));
    }

    return activeGroups[0].values.flatMap((first) =>
      activeGroups[1].values.map((second) => ({ label: `${first} - ${second}` })),
    );
  }, [saleMode, variationGroups]);

  const variantRows = variationLabels.map(({ label }) => {
    const input = variantInputs[label] ?? { sku: "", price: "", stock: "", barcode: "" };
    return { label, input };
  });

  const updateVariantInput = (label: string, key: keyof VariantInput, value: string) => {
    setVariantInputs((prev) => ({
      ...prev,
      [label]: {
        sku: prev[label]?.sku ?? "",
        price: prev[label]?.price ?? "",
        stock: prev[label]?.stock ?? "",
        barcode: prev[label]?.barcode ?? "",
        [key]: value,
      },
    }));
  };

  const handleCourierToggle = (key: string) => {
    setSelectedCouriers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveDraft = () => {
    console.log("Simpan Draft", { productName, masterSku, saleMode, variationGroups, variantRows });
    onOpenChange(false);
  };

  const handleSaveAndView = () => {
    console.log("Simpan & Tampilkan", { productName, masterSku, saleMode, variationGroups, variantRows });
    onOpenChange(false);
  };

  const photoLimitReached = images.length >= MAX_PHOTOS;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-4xl overflow-y-auto pb-10">
        <SheetHeader>
          <div className="space-y-1">
            <SheetTitle>Tambah Produk</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Buat produk baru dengan variasi, foto, dan informasi penjualan yang lengkap.
            </p>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-0 md:px-2">
          <Card className="p-5">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-sm font-semibold">Informasi Dasar</div>
                <p className="text-xs text-muted-foreground">Toko, kategori, dan foto produk.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label>Toko</Label>
                    <select
                      value={store}
                      onChange={(e) => setStore(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {STORE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Nama Produk</Label>
                    <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Masukkan nama produk" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Kategori</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Pilih kategori</option>
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Foto Produk</Label>
                      <p className="text-xs text-muted-foreground">Rasio gambar yang disarankan: 3:4</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">Maks. {MAX_PHOTOS}</span>
                  </div>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={cn(
                      "mt-2 rounded-3xl border border-dashed border-border bg-background/70 p-4 text-center transition",
                      photoLimitReached ? "opacity-60" : "hover:border-primary/70",
                    )}
                  >
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl bg-muted/30 p-4">
                      <UploadCloud className="h-8 w-8 text-primary" />
                      <div className="space-y-1 text-sm text-foreground">
                        <p>Tarik & lepas foto di sini atau klik untuk unggah</p>
                        <p className="text-xs text-muted-foreground">Foto hanya gambar, rasio 3:4.</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoLimitReached}
                      >
                        <ImagePlus className="h-4 w-4" /> Unggah Foto
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                  {images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((image, index) => (
                        <div
                          key={image.id}
                          draggable
                          onDragStart={() => setDragIndex(index)}
                          onDragOver={(event) => {
                            event.preventDefault();
                          }}
                          onDrop={() => {
                            if (dragIndex !== null) moveImage(dragIndex, index);
                          }}
                          className="group relative overflow-hidden rounded-3xl border border-border bg-muted"
                        >
                          <img
                            src={image.url}
                            alt={`Produk ${index + 1}`}
                            className="h-full min-h-[150px] w-full object-cover"
                          />
                          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-2 rounded-full bg-black/50 px-2 py-1 text-[11px] font-medium text-white opacity-90">
                            <GripVertical className="h-3.5 w-3.5" /> Seret
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-5">
            <div>
              <div className="text-sm font-semibold">Informasi Produk</div>
              <p className="text-xs text-muted-foreground">SKU induk dan deskripsi produk.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="grid gap-2">
                <Label>SKU Induk</Label>
                <Input value={masterSku} onChange={(e) => setMasterSku(e.target.value)} placeholder="Masukkan SKU induk" />
              </div>
              <div className="grid gap-2">
                <Label>Deskripsi Produk</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat produk" />
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-5">
            <div>
              <div className="text-sm font-semibold">Informasi Penjualan</div>
              <p className="text-xs text-muted-foreground">Pilih mode variasi dan kelola kombinasi produk.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { value: "single", label: "Variasi Tunggal" },
                { value: "multi", label: "Berbagai Variasi" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSaleMode(option.value)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm transition",
                    saleMode === option.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/80",
                  )}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{option.value === "multi" ? "Atur kombinasi variasi seperti BigSeller." : "Satu produk tanpa kombinasi."}</div>
                </button>
              ))}
            </div>

            {saleMode === "multi" ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  {variationGroups.map((group, index) => (
                    <Card key={group.id} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold">Variasi {index + 1}</div>
                          <p className="text-xs text-muted-foreground">Nama variasi dan nilai yang akan digabungkan.</p>
                        </div>
                        {variationGroups.length > 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => removeVariationGroup(group.id)}
                          >
                            Hapus
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <div className="grid gap-2">
                          <Label>Nama Variasi</Label>
                          <Input
                            value={group.name}
                            onChange={(e) => handleVariationChange(group.id, "name", e.target.value)}
                            placeholder="Contoh: Warna"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Nilai Variasi</Label>
                          <div className="flex gap-2">
                            <Input
                              value={group.valueInput}
                              onChange={(e) => handleVariationChange(group.id, "valueInput", e.target.value)}
                              placeholder="Tambah nilai"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => addVariationValue(group.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.values.map((value) => (
                              <button
                                type="button"
                                key={value}
                                onClick={() => removeVariationValue(group.id, value)}
                                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition hover:border-destructive"
                              >
                                {value} ×
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {variationGroups.length < 2 ? (
                    <Button size="sm" variant="outline" type="button" onClick={addVariationGroup}>
                      <Plus className="h-4 w-4" /> Tambah Variasi
                    </Button>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Sistem akan membuat kombinasi otomatis dari nilai variasi yang Anda masukkan.
                  </p>
                </div>
                <div className="overflow-x-auto rounded-3xl border border-border bg-background">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3">Kombinasi</th>
                        <th className="px-3 py-3">SKU</th>
                        <th className="px-3 py-3">Harga</th>
                        <th className="px-3 py-3">Stok</th>
                        <th className="px-3 py-3">Barcode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Tambahkan nama variasi dan nilai terlebih dahulu untuk melihat kombinasi.
                          </td>
                        </tr>
                      ) : (
                        variantRows.map(({ label, input }) => (
                          <tr key={label} className="border-t border-border">
                            <td className="px-3 py-3 font-medium text-foreground">{label}</td>
                            <td className="px-3 py-3">
                              <Input
                                value={input.sku}
                                onChange={(e) => updateVariantInput(label, "sku", e.target.value)}
                                placeholder="SKU"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                value={input.price}
                                onChange={(e) => updateVariantInput(label, "price", e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                value={input.stock}
                                onChange={(e) => updateVariantInput(label, "stock", e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                value={input.barcode}
                                onChange={(e) => updateVariantInput(label, "barcode", e.target.value)}
                                placeholder="Opsional"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Card className="p-4">
                <div className="grid gap-4">
                  <div className="text-sm font-semibold">Produk Tunggal</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>SKU</Label>
                      <Input value={variantInputs.Default?.sku ?? ""} onChange={(e) => updateVariantInput("Default", "sku", e.target.value)} placeholder="SKU" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Harga</Label>
                      <Input value={variantInputs.Default?.price ?? ""} onChange={(e) => updateVariantInput("Default", "price", e.target.value)} placeholder="0" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Stok</Label>
                      <Input value={variantInputs.Default?.stock ?? ""} onChange={(e) => updateVariantInput("Default", "stock", e.target.value)} placeholder="0" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Barcode</Label>
                      <Input value={variantInputs.Default?.barcode ?? ""} onChange={(e) => updateVariantInput("Default", "barcode", e.target.value)} placeholder="Opsional" />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="p-5 space-y-5">
              <div>
                <div className="text-sm font-semibold">Pengiriman</div>
                <p className="text-xs text-muted-foreground">Berat, dimensi, dan jasa kirim yang digunakan.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Berat (gram)</Label>
                  <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Panjang (cm)</Label>
                  <Input value={length} onChange={(e) => setLength(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Lebar (cm)</Label>
                  <Input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Tinggi (cm)</Label>
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div>
                <Label>Jasa Kirim</Label>
                <div className="grid gap-2">
                  {SHIPPING_SERVICES.map((service) => (
                    <label key={service.key} className="inline-flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={Boolean(selectedCouriers[service.key])}
                        onCheckedChange={() => handleCourierToggle(service.key)}
                      />
                      {service.label}
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-5">
              <div>
                <div className="text-sm font-semibold">Lainnya</div>
                <p className="text-xs text-muted-foreground">Pengaturan kondisi dan preorder.</p>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Kondisi</Label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="mb-0">Preorder</Label>
                      <p className="text-xs text-muted-foreground">Aktifkan jika produk dalam status preorder.</p>
                    </div>
                    <Switch checked={preorder} onCheckedChange={setPreorder} />
                  </div>
                  {preorder ? (
                    <Input
                      value={preorderNote}
                      onChange={(e) => setPreorderNote(e.target.value)}
                      placeholder="Catatan preorder atau estimasi tanggal"
                    />
                  ) : null}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <SheetFooter>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" type="button" onClick={handleSaveDraft}>Simpan Draft</Button>
            <Button type="button" onClick={handleSaveAndView}>Simpan & Tampilkan</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
