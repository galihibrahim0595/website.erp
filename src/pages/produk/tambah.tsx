import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Crop, Star, Trash2, UploadCloud, Video, X, Minus, Plus } from "lucide-react";
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

type VariationOption = {
  id: string;
  value: string;
  image?: string;
};

type VariationGroup = {
  id: string;
  name: string;
  options: VariationOption[];
};

type VariationRow = {
  price: string;
  promoPrice: string;
  stock: string;
  sku: string;
  barcode: string;
  skuManual?: boolean;
};

function TambahProdukPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const variationImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
  const [variationGroups, setVariationGroups] = useState<VariationGroup[]>([
    {
      id: "group-1",
      name: "Warna",
      options: [
        { id: "opt-1", value: "Hitam" },
        { id: "opt-2", value: "Putih" },
        { id: "opt-3", value: "Abu" },
      ],
    },
    {
      id: "group-2",
      name: "Ukuran",
      options: [
        { id: "opt-4", value: "M" },
        { id: "opt-5", value: "L" },
        { id: "opt-6", value: "XL" },
      ],
    },
  ]);
  const [variationRows, setVariationRows] = useState<Record<string, VariationRow>>({});
  const [massPrice, setMassPrice] = useState("");
  const [massStock, setMassStock] = useState("");
  const [massSku, setMassSku] = useState("");
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const variationCombinations = useMemo<VariationCombination[]>(() => {
    if (variationGroups.length === 0) return [];
    const optionLists = variationGroups.map((group) => group.options.map((option) => option.value).filter(Boolean));
    if (optionLists.some((options) => options.length === 0)) return [];

    const combos: VariationCombination[] = [];
    const build = (index: number, values: string[]) => {
      if (index === optionLists.length) {
        combos.push({ label: values.join(" - "), values });
        return;
      }
      optionLists[index].forEach((value) => build(index + 1, [...values, value]));
    };

    build(0, []);
    return combos;
  }, [variationGroups]);

  const slug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");

  const generateVariationSku = (combo: VariationCombination) => {
    const prefix = slug(sku);
    const suffix = combo.values.map(slug).filter(Boolean).join("-");
    return prefix ? `${prefix}${suffix ? `-${suffix}` : ""}` : suffix;
  };

  useEffect(() => {
    setVariationRows((prev) => {
      const next: Record<string, VariationRow> = { ...prev };
      let changed = false;

      variationCombinations.forEach((combo) => {
        const existing = prev[combo.label] ?? {
          price: "",
          promoPrice: "",
          stock: "",
          sku: "",
          barcode: "",
          skuManual: false,
        };

        if (existing.skuManual) {
          return;
        }

        const generatedSku = generateVariationSku(combo);
        if (existing.sku !== generatedSku || existing.skuManual !== false) {
          next[combo.label] = {
            ...existing,
            sku: generatedSku,
            skuManual: false,
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [variationCombinations, sku]);

  const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const updateVariationGroupName = (groupId: string, name: string) => {
    setVariationGroups((prev) => prev.map((group) => (group.id === groupId ? { ...group, name } : group)));
  };

  const addVariationGroup = () => {
    setVariationGroups((prev) => [
      ...prev,
      { id: createId(), name: "Variasi", options: [{ id: createId(), value: "" }] },
    ]);
  };

  const removeVariationGroup = (groupId: string) => {
    setVariationGroups((prev) => prev.filter((group) => group.id !== groupId));
  };

  const addVariationOption = (groupId: string) => {
    setVariationGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, options: [...group.options, { id: createId(), value: "" }] }
          : group
      )
    );
  };

  const updateVariationOptionValue = (groupId: string, optionId: string, value: string) => {
    setVariationGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map((option) => (option.id === optionId ? { ...option, value } : option)),
            }
          : group
      )
    );
  };

  const removeVariationOption = (groupId: string, optionId: string) => {
    setVariationGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, options: group.options.filter((option) => option.id !== optionId) }
          : group
      )
    );
  };

  const handleVariationOptionPhoto = (event: ChangeEvent<HTMLInputElement>, groupId: string, optionId: string) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const preview = URL.createObjectURL(file);
    setVariationGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map((option) =>
                option.id === optionId ? { ...option, image: preview } : option
              ),
            }
          : group
      )
    );
  };

  const updateVariationRow = (key: string, field: keyof VariationRow, value: string) => {
    setVariationRows((prev) => ({
      ...prev,
      [key]: {
        price: prev[key]?.price ?? "",
        promoPrice: prev[key]?.promoPrice ?? "",
        stock: prev[key]?.stock ?? "",
        sku: prev[key]?.sku ?? "",
        barcode: prev[key]?.barcode ?? "",
        skuManual: field === "sku" ? true : prev[key]?.skuManual ?? false,
        [field]: value,
      },
    }));
  };

  const applyMassPrice = () => {
    if (!massPrice) return;
    setVariationRows((prev) => {
      const next = { ...prev };
      variationCombinations.forEach((combo) => {
        next[combo.label] = {
          price: massPrice,
          promoPrice: next[combo.label]?.promoPrice ?? "",
          stock: next[combo.label]?.stock ?? "",
          sku: next[combo.label]?.sku ?? "",
          barcode: next[combo.label]?.barcode ?? "",
        };
      });
      return next;
    });
  };

  const applyMassStock = () => {
    if (!massStock) return;
    setVariationRows((prev) => {
      const next = { ...prev };
      variationCombinations.forEach((combo) => {
        next[combo.label] = {
          price: next[combo.label]?.price ?? "",
          promoPrice: next[combo.label]?.promoPrice ?? "",
          stock: massStock,
          sku: next[combo.label]?.sku ?? "",
          barcode: next[combo.label]?.barcode ?? "",
        };
      });
      return next;
    });
  };

  const applyMassSku = () => {
    if (!massSku) return;
    setVariationRows((prev) => {
      const next = { ...prev };
      variationCombinations.forEach((combo) => {
        next[combo.label] = {
          price: next[combo.label]?.price ?? "",
          promoPrice: next[combo.label]?.promoPrice ?? "",
          stock: next[combo.label]?.stock ?? "",
          sku: massSku,
          barcode: next[combo.label]?.barcode ?? "",
          skuManual: true,
        };
      });
      return next;
    });
  };

  const cropImageTo34 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const targetRatio = 3 / 4;
        const originalRatio = img.width / img.height;

        let cropWidth = img.width;
        let cropHeight = img.height;

        if (originalRatio > targetRatio) {
          cropWidth = Math.round(img.height * targetRatio);
        } else {
          cropHeight = Math.round(img.width / targetRatio);
        }

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Cannot get canvas context"));
          return;
        }

        ctx.drawImage(
          img,
          (img.width - cropWidth) / 2,
          (img.height - cropHeight) / 2,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Gagal memuat gambar"));
      };
      img.src = objectUrl;
    });
  };

  const normalizeVideoTo34 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const videoElement = document.createElement("video");
      videoElement.preload = "metadata";
      videoElement.src = objectUrl;
      videoElement.muted = true;
      videoElement.playsInline = true;

      videoElement.onloadedmetadata = () => {
        const targetRatio = 3 / 4;
        const originalRatio = videoElement.videoWidth / videoElement.videoHeight;
        let width = videoElement.videoWidth;
        let height = videoElement.videoHeight;

        if (originalRatio > targetRatio) {
          width = Math.round(videoElement.videoHeight * targetRatio);
        } else {
          height = Math.round(videoElement.videoWidth / targetRatio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Cannot get canvas context"));
          return;
        }

        const sx = Math.max(0, (videoElement.videoWidth - width) / 2);
        const sy = Math.max(0, (videoElement.videoHeight - height) / 2);
        ctx.drawImage(videoElement, sx, sy, width, height, 0, 0, width, height);

        resolve(objectUrl);
      };

      videoElement.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Gagal memuat video"));
      };
    });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const next: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        continue;
      }
      try {
        const cropped = await cropImageTo34(file);
        next.push(cropped);
      } catch {
        continue;
      }
    }

    setImages((prev) => [...prev, ...next].slice(0, 9));
  };

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) return;

    try {
      const normalized = await normalizeVideoTo34(file);
      setVideo(normalized);
    } catch {
      setVideo(URL.createObjectURL(file));
    }
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");
    setDragIndex(index);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    reorderImages(dragIndex, index);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const setCoverImage = (index: number) => {
    if (index === 0) return;
    reorderImages(index, 0);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const openCropEditor = (index: number) => {
    setCropIndex(index);
    setCropScale(1);
    setCropOffset({ x: 0, y: 0 });
    setCropModalOpen(true);
  };

  const closeCropEditor = () => {
    setCropModalOpen(false);
    setCropIndex(null);
    setCropDragStart(null);
    setIsCropDragging(false);
  };

  const startCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsCropDragging(true);
    setCropDragStart({ x: event.clientX, y: event.clientY });
  };

  const updateCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!isCropDragging || !cropDragStart) return;
    const deltaX = event.clientX - cropDragStart.x;
    const deltaY = event.clientY - cropDragStart.y;
    setCropOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    setCropDragStart({ x: event.clientX, y: event.clientY });
  };

  const endCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsCropDragging(false);
    setCropDragStart(null);
  };

  const cropImageToSquare = async (src: string, scale: number, offset: { x: number; y: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const size = 600;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Cannot get canvas context"));
          return;
        }

        const displayWidth = img.width * scale;
        const displayHeight = img.height * scale;
        const cropX = Math.round((displayWidth / 2 + offset.x - size / 2) / scale);
        const cropY = Math.round((displayHeight / 2 + offset.y - size / 2) / scale);
        const cropWidth = Math.round(size / scale);
        const cropHeight = Math.round(size / scale);
        const sx = Math.max(0, Math.min(img.width - cropWidth, cropX));
        const sy = Math.max(0, Math.min(img.height - cropHeight, cropY));

        ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = () => reject(new Error("Cannot load crop image"));
      img.src = src;
    });
  };

  const saveCrop = async () => {
    if (cropIndex === null) return;
    const src = images[cropIndex];
    try {
      const cropped = await cropImageToSquare(src, cropScale, cropOffset);
      setImages((prev) => {
        const next = [...prev];
        next[cropIndex] = cropped;
        return next;
      });
    } catch {
      // keep current image if crop fails
    } finally {
      closeCropEditor();
    }
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
                  <option key={option} value={option}>
                    {option}
                  </option>
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
                  <option key={option} value={option}>
                    {option}
                  </option>
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
              <div className="flex flex-wrap items-start gap-2">
                <div
                  className="inline-flex h-[90px] w-[90px] flex-col items-center justify-center rounded-[8px] border border-dashed border-border bg-background text-center text-sm text-foreground transition hover:border-primary/80"
                  style={{ aspectRatio: "1 / 1" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-6 w-6" />
                  <span className="mt-2 text-[10px]">Tambah Foto</span>
                  <span className="text-[10px] text-muted-foreground">{images.length}/9</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                {images.length > 0 && (
                  <div className="flex flex-wrap items-start gap-2">
                    {images.map((src, index) => (
                      <div
                        key={`${src}-${index}`}
                        className={`group relative h-[90px] w-[90px] overflow-hidden rounded-[8px] border border-border bg-muted transition ${dragOverIndex === index ? "ring-2 ring-primary" : ""}`}
                        style={{ aspectRatio: "1 / 1" }}
                        draggable
                        onDragStart={(event) => handleDragStart(event, index)}
                        onDragOver={(event) => handleDragOver(event, index)}
                        onDrop={(event) => handleDrop(event, index)}
                        onDragEnd={handleDragEnd}
                      >
                        {index === 0 && (
                          <span className="absolute left-2 top-2 z-10 rounded-full border border-border bg-white/90 px-2 py-1 text-[10px] font-semibold text-foreground">
                            Cover
                          </span>
                        )}
                        <img src={src} alt={`Foto ${index + 1}`} className="h-full w-full object-cover object-center" />
                        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-1 bg-black/50 p-1 opacity-0 transition duration-200 group-hover:opacity-100">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm hover:bg-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCropEditor(index);
                            }}
                          >
                            <Crop className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm hover:bg-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              setCoverImage(index);
                            }}
                          >
                            <Star className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm hover:bg-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeImage(index);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Video Produk</Label>
                <span className="text-xs text-muted-foreground">Maks. 1 video</span>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <div
                  className="inline-flex h-[90px] w-[90px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-background text-center text-sm text-foreground transition hover:border-primary/80"
                  style={{ aspectRatio: "1 / 1" }}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Video className="h-6 w-6" />
                  <span className="mt-2 text-[10px]">Tambah Video</span>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </div>
                {video && (
                  <div
                    className="h-[90px] w-[90px] overflow-hidden rounded-3xl border border-border bg-muted"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <video
                      controls
                      src={video}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {cropModalOpen && cropIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <div className="text-lg font-semibold">Edit Crop Foto</div>
                  <p className="text-sm text-muted-foreground">Seret gambar untuk menyesuaikan bingkai crop 1:1.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted"
                  onClick={closeCropEditor}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-[2fr_1fr]">
                <div className="relative overflow-hidden rounded-3xl border border-border bg-black p-0" style={{ aspectRatio: "1 / 1" }}>
                  <div
                    className="relative h-full w-full cursor-grab"
                    onPointerDown={startCropDrag}
                    onPointerMove={updateCropDrag}
                    onPointerUp={endCropDrag}
                    onPointerCancel={endCropDrag}
                  >
                    <img
                      src={images[cropIndex]}
                      alt="Crop preview"
                      className="absolute left-1/2 top-1/2 h-auto max-w-none"
                      style={{ transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropScale})` }}
                    />
                    <div className="pointer-events-none absolute inset-0 border border-white/80" />
                  </div>
                </div>
                <div className="space-y-4 rounded-3xl border border-border bg-background p-4">
                  <div>
                    <div className="text-sm font-semibold">Zoom</div>
                    <p className="text-xs text-muted-foreground">Gunakan tombol untuk memperbesar atau mengecilkan area crop.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setCropScale((scale) => Math.max(1, scale - 0.1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCropScale((scale) => Math.min(3, scale + 0.1))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <div className="rounded-full border border-border bg-muted px-3 py-1 text-sm">{Math.round(cropScale * 100)}%</div>
                  </div>
                  <div className="grid gap-3">
                    <Button type="button" onClick={saveCrop}>Simpan Crop</Button>
                    <Button type="button" variant="outline" onClick={closeCropEditor}>Batal</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Variasi Produk</div>
              <p className="text-xs text-muted-foreground">Atur variasi seperti Shopee Seller Center.</p>
            </div>
            <Button type="button" onClick={addVariationGroup}>Tambah Variasi</Button>
          </div>

          <div className="space-y-4">
            {variationGroups.map((group, groupIndex) => (
              <Card key={group.id} className="rounded-3xl border border-border bg-background p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <Label className="mb-1">Variasi {groupIndex + 1}</Label>
                    <Input
                      value={group.name}
                      onChange={(event) => updateVariationGroupName(group.id, event.target.value)}
                      placeholder={`Nama variasi ${groupIndex + 1}`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addVariationOption(group.id)}>
                      Tambah opsi
                    </Button>
                    {variationGroups.length > 1 ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeVariationGroup(group.id)}>
                        Hapus Variasi
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Opsi</div>
                  <div className="grid gap-3">
                    {group.options.map((option) => (
                      <div key={option.id} className="grid gap-3 rounded-2xl border border-border bg-muted p-3 sm:grid-cols-[1fr_auto]">
                        <div className="grid gap-2">
                          <Input
                            value={option.value}
                            onChange={(event) => updateVariationOptionValue(group.id, option.id, event.target.value)}
                            placeholder="Nama opsi"
                          />
                          {groupIndex === 0 && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <div className="h-16 w-16 overflow-hidden rounded-xl border border-border bg-background">
                                {option.image ? (
                                  <img src={option.image} alt={option.value || "Opsi"} className="h-full w-full object-cover object-center" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">Upload Foto</div>
                                )}
                              </div>
                              <div className="grid gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => variationImageInputRefs.current[option.id]?.click()}
                                >
                                  Upload Foto
                                </Button>
                                <input
                                  ref={(element) => {
                                    variationImageInputRefs.current[option.id] = element;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(event) => handleVariationOptionPhoto(event, group.id, option.id)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {group.options.length > 1 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => removeVariationOption(group.id, option.id)}>
                              Hapus
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="rounded-3xl border border-border bg-background p-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label>Atur Semua Harga</Label>
                <Input value={massPrice} onChange={(event) => setMassPrice(event.target.value)} placeholder="Harga" />
                <Button type="button" onClick={applyMassPrice}>Atur Semua Harga</Button>
              </div>
              <div className="grid gap-2">
                <Label>Atur Semua Stok</Label>
                <Input value={massStock} onChange={(event) => setMassStock(event.target.value)} placeholder="Stok" />
                <Button type="button" onClick={applyMassStock}>Atur Semua Stok</Button>
              </div>
              <div className="grid gap-2">
                <Label>Atur Semua SKU</Label>
                <Input value={massSku} onChange={(event) => setMassSku(event.target.value)} placeholder="SKU" />
                <Button type="button" onClick={applyMassSku}>Atur Semua SKU</Button>
              </div>
            </div>
          </Card>

          <div className="overflow-x-auto rounded-3xl border border-border bg-background">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Thumbnail</th>
                  {variationGroups.map((group) => (
                    <th key={group.id} className="px-3 py-3">{group.name}</th>
                  ))}
                  <th className="px-3 py-3">Harga</th>
                  <th className="px-3 py-3">Harga Diskon</th>
                  <th className="px-3 py-3">Stok</th>
                  <th className="px-3 py-3">SKU Variasi</th>
                  <th className="px-3 py-3">Barcode</th>
                </tr>
              </thead>
              <tbody>
                {variationCombinations.map((combo) => {
                  const row = variationRows[combo.label] || { price: "", promoPrice: "", stock: "", sku: "", barcode: "" };
                  const firstOption = variationGroups[0]?.options.find((option) => option.value === combo.values[0]);
                  return (
                    <tr key={combo.label} className="border-t border-border">
                      <td className="px-3 py-3 align-middle">
                        {firstOption?.image ? (
                          <img src={firstOption.image} alt={combo.label} className="h-14 w-14 rounded-xl object-cover object-center" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-[10px] text-muted-foreground">No Foto</div>
                        )}
                      </td>
                      {combo.values.map((value, index) => (
                        <td key={`${combo.label}-${index}`} className="px-3 py-3 align-middle">{value}</td>
                      ))}
                      <td className="px-3 py-3 align-middle">
                        <Input
                          value={row.price}
                          onChange={(event) => updateVariationRow(combo.label, "price", event.target.value)}
                          placeholder="Harga"
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Input
                          value={row.promoPrice}
                          onChange={(event) => updateVariationRow(combo.label, "promoPrice", event.target.value)}
                          placeholder="Diskon"
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Input
                          value={row.stock}
                          onChange={(event) => updateVariationRow(combo.label, "stock", event.target.value)}
                          placeholder="Stok"
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Input
                          value={row.sku}
                          onChange={(event) => updateVariationRow(combo.label, "sku", event.target.value)}
                          placeholder="SKU"
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Input
                          value={row.barcode}
                          onChange={(event) => updateVariationRow(combo.label, "barcode", event.target.value)}
                          placeholder="Barcode"
                        />
                      </td>
                    </tr>
                  );
                })}
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
              {preorder && <Input value="Sedang preorder" readOnly />}
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
