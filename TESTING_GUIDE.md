# 🚀 Quick Testing Guide

## Server URLs
- **Frontend**: http://localhost:8082
- **Backend API**: http://localhost:4000
- **Console**: F12 in browser

---

## ✅ TEST 1: Bulk Update Harga Modal

### Steps
1. Navigate to **Gudang > Stock**
2. Select 2-3 SKUs (checkbox kiri)
3. Click **"Update Harga Modal"** button (toolbar)
4. Select method: **"Ganti menjadi nominal"**
5. Input: **50000**
6. Click **"Simpan"**

### Expected Results
- ✅ Modal closes automatically
- ✅ Table shows new price (50000) immediately
- ✅ Toast: "Harga modal 2 SKU berhasil diperbarui"
- ✅ Checkbox cleared
- ✅ Button stops loading

### Console Check
```
[MODAL] Save button clicked
[SYNC] ✓ Sync completed successfully
[SKUROWS] Recomputing skuRows
[MODAL] React state updates complete
[MODAL] ✓ Loading state set to false
```

---

## ✅ TEST 2: Edit Individual Price (Harga Modal)

### Steps
1. Click **edit icon (pencil)** in "Harga Modal" column
2. Change price to: **60000**
3. Click **"Simpan"**

### Expected Results
- ✅ Modal closes automatically
- ✅ Table shows new price (60000) immediately
- ✅ Toast: "Harga modal SKU berhasil diperbarui"
- ✅ Button stops loading

### Console Check
```
[EDIT] Save button clicked
[SYNC] ✓ Sync completed successfully
[EDIT] React state updates complete
[EDIT] ✓ Loading state set to false
```

---

## ✅ TEST 3: Edit Individual Price (Harga Jual)

### Steps
1. Click **edit icon (pencil)** in "Harga Jual" column
2. Change price to: **90000**
3. Click **"Simpan"**

### Expected Results
- ✅ Modal closes automatically
- ✅ Table shows new price (90000) immediately
- ✅ Toast: "Harga jual SKU berhasil diperbarui"

---

## 🔄 TEST 4: Verify Sync to Other Pages

After completing Test 1 or Test 2:

### Go to Produk > Mapping SKU
- ✅ Harga Modal should be **50000** (not old value)
- ✅ Harga Jual should be **90000** (if edited)
- **Note**: May need to refresh if page uses separate data source

### Go to Produk > Produk
- ✅ Harga Modal should match new value
- ✅ Harga Jual should match new value

---

## 🔍 Console Log Reference

### When Everything Works (Timeline)
```
11:45:30.123 [MODAL] Save button clicked
11:45:30.134 [MODAL] Starting save with method: set, value: 50000
11:45:30.145 [BULK] Starting bulk update for 2 SKUs
11:45:30.156 [SYNC] Starting sync for SKU ID="wsku-1"
11:45:30.234 [SYNC] API Response status: 200
11:45:30.245 [SYNC] ✓ API update successful
11:45:30.256 [SYNC] Setting lastSyncTime to 1721142345345
11:45:30.267 [SKUROWS] Recomputing skuRows, lastSyncTime=1721142345345
11:45:30.278 [FILTER] Recomputing filteredRows
11:45:30.289 [MODAL] Waiting for React state updates to process...
11:45:30.400 [MODAL] React state updates complete
11:45:30.411 [MODAL] Closing modal now
11:45:30.422 [MODAL] ✓ Loading state set to false
```

### 🚨 If Something Goes Wrong

**Symptom**: Button stuck loading
- Look for: `[SYNC] ✗ ERROR:` in console
- Check: Is API endpoint responding? (`[SYNC] API Response status: 200`)

**Symptom**: Modal not closing
- Look for: `[MODAL] Closing modal now` should appear
- Check: Is `onOpenChange(false)` being called?

**Symptom**: Price not updating in table
- Look for: `[SKUROWS] Recomputing skuRows` should appear
- Check: Is `lastSyncTime` changing in logs?

**Symptom**: No toast message
- Look for: `toast.success(...)` should be called
- Verify: Toast library (Sonner) is working

---

## 📊 Performance Notes

- **Sync latency**: Usually 50-200ms for API
- **React re-render wait**: 100ms (should complete in 10-30ms)
- **Total modal close time**: ~500-700ms from click to modal gone
- **Table re-render**: Immediate (150-300ms)

---

## 🔧 If Need to Debug Further

1. **Add breakpoints in DevTools**:
   - `src/routes/gudang.stock.tsx` → `handleSave()` function
   - Set breakpoint before `onOpenChange(false)`

2. **Check warehouseSKUs in console**:
   ```javascript
   // In browser console:
   import { warehouseSKUs } from '@/services/warehouse-master';
   console.log(warehouseSKUs[0]);  // Check if costPrice updated
   ```

3. **Check API response**:
   - Open Network tab → Find PUT request to `/api/warehouse-skus/{id}`
   - Response should be: `{success: true, message: "...", id: "wsku-1"}`

---

## ✨ Success Criteria

All of these should be true after fix:

- ✅ Klik Simpan → modal tutup (automatic)
- ✅ UI update langsung (tidak perlu refresh)
- ✅ Harga berubah di tabel
- ✅ Toast muncul
- ✅ Button loading animation berhenti
- ✅ Harga sync ke halaman lain
- ✅ Console log terurut rapi

**If all ✅, FIXED!**

---

**Last Updated**: 2026-07-14
**Fix Status**: ✅ DEPLOYED
**Ready for Testing**: YES
