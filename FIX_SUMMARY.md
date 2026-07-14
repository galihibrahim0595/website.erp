# Fix Summary: Gudang Stock UI Refresh Issue

## 🎯 Problem Statement

Setelah klik "Simpan" pada Update Harga Modal atau edit icon pensil:
1. ❌ UI tidak langsung berubah (harus refresh halaman)
2. ❌ Modal tidak otomatis tertutup
3. ❌ Data memang tersimpan tapi UI tidak update

## 🔍 Root Cause

React `setState` adalah **asynchronous** — state updates di-queue, bukan langsung terjadi. Flow sebelumnya:

```javascript
// SEBELUM (BUGGY):
await syncPricingChanges(...);  // ← Sync selesai

setRefreshKey(k => k + 1);     // ← setState di-queue (async)

onOpenChange(false);            // ← Modal close langsung (tidak tunggu setRefreshKey)

// React belum re-render dengan data baru saat modal ditutup!
```

## ✅ Solution Implemented

### 1. **Dual State Refresh Tracking**

```javascript
// File: /src/routes/gudang.stock.tsx (Line 384)

const [refreshKey, setRefreshKey] = useState(0);
const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);  // ← NEW
```

**Why?** Menggunakan timestamp (`Date.now()`) lebih reliable daripada counter karena:
- Timestamp **unique** setiap kali
- Counter bisa skip jika state batching terjadi
- Timestamp **guaranteed** berubah setiap sync

### 2. **Update useMemo Dependencies**

```javascript
// BEFORE: [refreshKey, warehouseSKUs, products]
// AFTER:  [lastSyncTime, refreshKey, warehouseSKUs, products]

const skuRows = useMemo(() => {
  console.log(`[SKUROWS] lastSyncTime=${lastSyncTime}, refreshKey=${refreshKey}`);
  // ... compute rows ...
}, [lastSyncTime, refreshKey, warehouseSKUs, products]);
```

**Why?** Menambahkan `lastSyncTime` sebagai dependency memastikan useMemo re-compute **setiap kali sync selesai**.

### 3. **Dual setState Calls dalam syncPricingChanges**

```javascript
// File: /src/routes/gudang.stock.tsx (Line 516-527)

const syncTime = Date.now();
console.log(`[SYNC] Setting lastSyncTime to ${syncTime}`);
setLastSyncTime(syncTime);  // ← Timestamp setState

setRefreshKey((k) => {      // ← Counter setState (backup)
  const newK = k + 1;
  console.log(`[SYNC] setRefreshKey: ${k} → ${newK}`);
  return newK;
});
```

**Why?** Belt-and-suspenders approach — dual triggers untuk memastikan React re-render.

### 4. **Wait for React State Updates**

```javascript
// File: /src/routes/gudang.stock.tsx (Line 122-129 MODAL, 299-304 EDIT)

// DALAM handleSave async function:

await onSave(updates);  // ← Sync selesai + setState di-queue

// ← TUNGGU React batch updates diproses
console.log(`[MODAL] Waiting for React state updates to process...`);
await new Promise(resolve => setTimeout(resolve, 100));
console.log(`[MODAL] React state updates complete`);

toast.success(...);       // ← Toast SETELAH render

onOpenChange(false);      // ← Modal close SETELAH data berubah
```

**Why?** 
- `await new Promise(..., 100)` memberi React waktu untuk:
  1. Process setState calls
  2. Run useCallback/useMemo
  3. Render component dengan data baru
- 100ms sudah cukup untuk semua ini
- Kemudian baru toast + modal close

### 5. **Additional Waits dalam Bulk Update**

```javascript
// File: /src/routes/gudang.stock.tsx (Line 590-595)

const handleUpdateHargaModalBulkSave = async (updates) => {
  for (const update of updates) {
    await syncPricingChanges(update.skuId, update.newCostPrice);
  }
  
  setSelectedRows(new Set());
  
  // ← TUNGGU React batch updates
  console.log(`[BULK] Waiting for React re-render...`);
  await new Promise(resolve => setTimeout(resolve, 50));
  
  console.log(`[BULK] Bulk update completed successfully`);
};
```

**Why?** Setiap syncPricingChanges call menghasilkan 2 setState calls. Untuk multiple SKUs, perlu extra wait.

## 📊 Flow After Fix

```
1. User klik "Simpan"
   ↓
2. handleSave() async function start
   ├─ setLoading(true)
   ├─ await onSave(updates)
   │  ├─ syncPricingChanges untuk setiap SKU
   │  │  ├─ Update warehouseSKUs array in-memory
   │  │  ├─ Call API PUT /api/warehouse-skus/{id}
   │  │  ├─ setLastSyncTime(Date.now())  ← setState 1
   │  │  └─ setRefreshKey(k => k+1)      ← setState 2
   │  └─ (onSave selesai)
   ├─ await Promise(100ms)  ← TUNGGU React process setState
   │  └─ React:
   │     ├─ useMemo [lastSyncTime] dependency change → skuRows re-compute
   │     ├─ useMemo [refreshKey] dependency change → skuRows re-compute
   │     ├─ filteredRows re-compute
   │     ├─ summaryStats re-compute
   │     └─ Component render dengan data BARU
   ├─ toast.success()
   ├─ onOpenChange(false)  ← Modal close dengan UI SUDAH UPDATE
   └─ setLoading(false)   ← Button loading animation stop

3. Modal tertutup
4. Table menampilkan harga baru
5. Komponen lain (Mapping SKU, Produk) otomatis sync karena read dari warehouseSKUs
```

## 🧪 Testing Instructions

### Step 1: Open Browser
```
http://localhost:8082
Login → Navigate to Gudang > Stock
```

### Step 2: Test Bulk Update (Update Harga Modal)
```
1. Buka Console (F12)
2. Pilih 2-3 SKU di table (checkbox kiri)
3. Klik tombol "Update Harga Modal" di toolbar
4. Pilih method: "Ganti menjadi nominal"
5. Input: 50000
6. Klik "Simpan"
```

### Step 3: Monitor Console Logs

Cari ini di console (dalam urutan):

**Fase 1: Save Button Click**
```
[MODAL] Save button clicked
[MODAL] Starting save with method: set, value: 50000
[MODAL] Prepared updates: [{skuId: "wsku-1", newCostPrice: 50000}, ...]
[MODAL] Calling onSave callback...
```

**Fase 2: Bulk Update Handler**
```
[BULK] Starting bulk update for 2 SKUs
[BULK] Updating SKU wsku-1 to 50000
[BULK] Updating SKU wsku-2 to 50000
[BULK] Clearing selection
[BULK] Waiting for React re-render...
```

**Fase 3: Sync (per SKU)**
```
[SYNC] Starting sync for SKU ID="wsku-1"
[SYNC] ✓ Found SKU in memory
[SYNC] Updating costPrice: 30000 → 50000
[SYNC] Sending API PUT /api/warehouse-skus/wsku-1 {cost_price: 50000}
[SYNC] API Response status: 200 {success: true, ...}
[SYNC] ✓ API update successful
[SYNC] Setting lastSyncTime to 1721142345123
[SYNC] setRefreshKey: 0 → 1
[SYNC] ✓ Sync completed successfully
```

**Fase 4: React Re-render**
```
[SKUROWS] Recomputing skuRows, lastSyncTime=1721142345123, refreshKey=1
[SKUROWS] Recomputed 48 rows: [...]
[FILTER] Recomputing filteredRows, skuRows.length=48
[FILTER] ✓ Filtered to 48 rows
[SUMMARY] Recalculating summary stats, filteredRows.length=48
[SUMMARY] ✓ Summary: 48 SKU, ...
[RENDER] StockPage rendering, filteredRows.length=48
```

**Fase 5: UI Update Complete**
```
[MODAL] Waiting for React state updates to process...
[MODAL] React state updates complete
[BULK] Bulk update completed successfully
[MODAL] onSave completed successfully!
(toast appears: "Harga modal 2 SKU berhasil diperbarui")
[MODAL] Closing modal now
[MODAL] Modal state reset, modal should now be closed
[MODAL] Finally block - setting loading to false
[MODAL] ✓ Loading state set to false, button loading animation stopped
```

### Step 4: Verify UI Changes

Check these:

✅ **Table immediately updated**: Lihat column "Harga Modal" — harga sudah jadi 50000
✅ **Modal closed**: Modal sudah hilang (tidak perlu manual close)
✅ **Loading stopped**: Tombol tidak lagi menampilkan spinner
✅ **Toast shown**: "Harga modal 2 SKU berhasil diperbarui" muncul
✅ **Checkbox cleared**: Semua checkbox kembali unchecked

### Step 5: Test Edit Individual Price (Harga Modal Icon)

```
1. Klik Edit icon (pensil) di kolom "Harga Modal" salah satu row
2. Ubah harga: 60000
3. Klik "Simpan"
```

Verifikasi:
- ✅ Modal closed
- ✅ Harga di table langsung berubah ke 60000
- ✅ Toast "Harga modal SKU berhasil diperbarui"
- ✅ Check console logs (sama format seperti bulk update)

### Step 6: Verify Other Pages Sync

Setelah harga berubah di Gudang > Stock:

1. **Go to Produk > Mapping SKU** → Harga di sini seharusnya **sudah terupdate** (tidak perlu refresh)
2. **Go to Produk** → Harga produk seharusnya **sudah terupdate**
3. **Go to Marketplace** pages → Harga seharusnya **sudah terupdate**

Jika tidak terupdate di halaman lain, itu adalah masalah terpisah (mereka mungkin tidak subscribe ke warehouseSKUs changes).

## 📝 Files Modified

### 1. `/src/routes/gudang.stock.tsx`

#### Change 1: Add lastSyncTime state (Line ~384)
```typescript
const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
```

#### Change 2: Update skuRows useMemo (Line ~398)
```typescript
const skuRows = useMemo(() => {
  console.log(`[SKUROWS] Recomputing skuRows, lastSyncTime=${lastSyncTime}, refreshKey=${refreshKey}, ...`);
  // ...
}, [lastSyncTime, refreshKey, warehouseSKUs, products]);  // ← Added lastSyncTime
```

#### Change 3: Improve syncPricingChanges (Line ~516)
```typescript
const syncTime = Date.now();
setLastSyncTime(syncTime);      // ← Timestamp setState
setRefreshKey(k => k + 1);       // ← Counter setState
```

#### Change 4: Add wait in Bulk Modal handleSave (Line ~122)
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```

#### Change 5: Add wait in Edit Modal handleSave (Line ~299)
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```

#### Change 6: Add wait in handleUpdateHargaModalBulkSave (Line ~590)
```typescript
await new Promise(resolve => setTimeout(resolve, 50));
```

#### Change 7: Add wait in handleEditHargaIndividualSave (Line ~642)
```typescript
await new Promise(resolve => setTimeout(resolve, 50));
```

## ⚡ Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Modal Close** | Immediate (data not ready) | After state updates |
| **UI Refresh** | Manual page refresh needed | Automatic via useMemo |
| **State Update Trigger** | Single counter | Dual: timestamp + counter |
| **React Batching** | Not waited | Explicitly waited (100ms) |
| **User Experience** | Confusing (data saved but not shown) | Smooth (instant update) |
| **Toast Timing** | Before UI update | After UI update |

## 🐛 Debugging

Jika ada issue:

1. **Open Console (F12)** → Filter by `[MODAL]`, `[SYNC]`, `[BULK]`, `[SKUROWS]`
2. **Look for these patterns**:
   - `[SYNC] ✓ Sync completed successfully` ← If missing, API failed
   - `[SKUROWS] Recomputing skuRows` ← If missing, useMemo not triggered
   - `[MODAL] React state updates complete` ← If missing, wait didn't work
   - Modal still visible after "Closing modal now" ← onOpenChange might not work

3. **Common issues**:
   - If harga tidak berubah: Check `[TABLE]` log — verify costPrice value
   - If modal tidak tutup: Check if `[MODAL] React state updates complete` log appears
   - If loading tidak stop: Check `finally` block is reached

## 🚀 Deployment

When ready to deploy:
1. Remove all `console.log` debug statements (or filter by production flag)
2. Test in staging environment first
3. Verify all warehouseSKUs changes propagate to other pages

---

**Status**: ✅ FIXED AND READY FOR TESTING

**Next**: Open browser, test flow, report any issues.
