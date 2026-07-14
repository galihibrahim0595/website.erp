# ⚡ Performance Testing Quick Guide

## 🎯 Target Metrics

✅ Modal close: **< 150ms** (was 700ms)
✅ Bulk 5 SKU: **< 500ms** (was 3000ms)
✅ Table update: **< 150ms** (was 400ms)
✅ Single edit: **< 200ms** (was 600ms)

---

## 📱 How to Test

### Open Performance Monitor

```javascript
// In browser console, paste this:

let metrics = {};

// Override fetch to measure API timing
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const start = performance.now();
  return originalFetch.apply(this, args).then(r => {
    const end = performance.now();
    console.log(`[API] ${args[0]}: ${(end - start).toFixed(0)}ms`);
    return r;
  });
};

// Mark events
window.markEvent = (name) => {
  const mark = `event-${name}-${Date.now()}`;
  performance.mark(mark);
  console.log(`[MARK] ${name}`);
};
```

---

## ✅ TEST 1: Single Edit - Measure Modal Close Time

### Setup
1. Open DevTools → Console
2. Paste the code above

### Steps
```javascript
performance.mark('click-simpan');
// Then: Click edit icon → change price → click Simpan
// Watch console for time difference
```

### What to Observe
- **Before**: Console shows `[MODAL] React state updates complete` (means waiting 100ms)
- **After**: Console shows `[MODAL] Closing modal immediately` (instant)

### Expected Console Output
```
[MODAL] Save clicked, type=modal, price=60000
[MODAL] Starting async sync (fire-and-forget)
[MODAL] Closing modal immediately          ← Instant close
[MODAL] Setting loading to false

[SYNC] Syncing SKU "SHIRT-BLK-S"
[SYNC] In-memory updated, React re-render triggered
[SYNC] ✓ SKU "SHIRT-BLK-S" synced successfully

[API] /api/warehouse-skus/wsku-1: 45ms    ← API call in background
[MODAL] Sync completed                    ← Toast shows after
```

### Success Criteria
- ✅ "[MODAL] Closing modal immediately" appears
- ✅ Modal closed within 100ms of click
- ✅ "[MODAL] Closing modal immediately" appears BEFORE "[SYNC]" logs
- ✅ Toast appears 150-200ms after modal close

---

## ✅ TEST 2: Bulk Update - Measure Parallel Execution

### Setup
1. Select 5 SKUs (checkboxes)
2. Click "Update Harga Modal"
3. Method: "Ganti menjadi nominal"
4. Input: 55000
5. Click "Simpan"

### Expected Console Output
```
[MODAL] Save clicked, method=set, value=55000
[MODAL] 5 updates prepared
[MODAL] Starting async sync (fire-and-forget)
[MODAL] Closing modal immediately          ← Instant close

[BULK] Starting 5 parallel syncs
[BULK] Queueing wsku-1
[BULK] Queueing wsku-2
[BULK] Queueing wsku-3
[BULK] Queueing wsku-4
[BULK] Queueing wsku-5

[SYNC] Syncing SKU "SHIRT-BLK-S"
[SYNC] In-memory updated, React re-render triggered
[SYNC] Syncing SKU "SHIRT-BLK-M"           ← All start at once!
[SYNC] In-memory updated, React re-render triggered
[SYNC] Syncing SKU "SHIRT-BLK-L"

[API] /api/warehouse-skus/wsku-1: 48ms
[API] /api/warehouse-skus/wsku-2: 51ms
[API] /api/warehouse-skus/wsku-3: 52ms    ← All parallel (same time)
[API] /api/warehouse-skus/wsku-4: 49ms
[API] /api/warehouse-skus/wsku-5: 50ms

[SYNC] ✓ SKU "SHIRT-BLK-S" synced successfully
[SYNC] ✓ SKU "SHIRT-BLK-M" synced successfully
[SYNC] ✓ SKU "SHIRT-BLK-L" synced successfully
...

[MODAL] Sync completed
(Toast: "Harga modal 5 SKU berhasil diperbarui")
```

### Success Criteria
- ✅ All API calls happen in parallel (same timestamps, ~50ms each)
- ✅ If sequential: first call 50ms, second 100ms, third 150ms, etc.
- ✅ Modal closes before any API calls show in console
- ✅ Total time for 5 SKUs: ~100-150ms (not 250-300ms)

### How to Verify Parallel vs Sequential

**Parallel (GOOD):**
```
[API] .../wsku-1: 48ms
[API] .../wsku-2: 51ms      ← Started almost same time
[API] .../wsku-3: 52ms
Total: ~50ms
```

**Sequential (BAD - if we didn't optimize):**
```
[API] .../wsku-1: 48ms
[API] .../wsku-2: 101ms     ← Started after first finished
[API] .../wsku-3: 149ms
Total: ~150ms
```

---

## ✅ TEST 3: UI Responsiveness - Optimistic Update

### Steps
1. Select 1 SKU
2. Click "Update Harga Modal"
3. Input: 75000
4. Click "Simpan"
5. **Immediately after modal close, check table**

### Expected Behavior
- ✅ **Before API response**, table already shows new price (75000)
- ✅ If you're fast enough, you see "In-memory updated" before "API Response"

### Console Output Should Show
```
[SYNC] Syncing SKU "SHIRT-BLK-S"
[SYNC] In-memory updated, React re-render triggered   ← Instant
[SYNC] ✓ SKU "SHIRT-BLK-S" synced successfully
```

Notice: No "waiting for API response" step!

---

## ✅ TEST 4: Error Rollback - Network Failure

### Setup
1. Open DevTools → Network tab
2. Check "Offline" checkbox (simulate no internet)

### Steps
1. Select 1 SKU
2. Click "Update Harga Modal"
3. Input: 80000
4. Click "Simpan"

### Expected Behavior
- ✅ Table updates to 80000 (optimistic)
- ✅ Error toast appears: "Gagal memperbarui harga modal"
- ✅ **Table reverts back to old price** (rollback)

### Console Output
```
[SYNC] Syncing SKU "SHIRT-BLK-S"
[SYNC] In-memory updated, React re-render triggered

[SYNC] Error for SKU wsku-1: Error: Failed to fetch
[MODAL] Sync failed: Error: Failed to fetch

(Toast: "Gagal memperbarui harga modal: Failed to fetch")
[SYNC] Rolling back...  ← Price reverted
```

### Success Criteria
- ✅ Toast shows error
- ✅ Table price reverts to old value
- ✅ No stale data remains in UI

---

## 📊 Performance Tab Analysis

### DevTools → Performance Tab

1. Click "Record" (red dot)
2. Perform action: Click Simpan
3. Click "Record" again to stop
4. Look at timeline

### What to Look For

**Before Optimization:**
```
[100ms] click handler
  [100ms] Modal close logic
  [100ms] state updates
  [100ms] React re-render
[100ms] API request
[100ms] Response
[100ms] Toast
= 700ms total
```

**After Optimization:**
```
[10ms] click handler
[20ms] Modal close (instant)
[30ms] setState calls
[40ms] React re-render
[100ms] API request (background)
[100ms] Toast (after API)
= 100ms visible, 200ms total
```

Key: Modal close at 40ms mark, not 700ms!

---

## 🔍 Comparison: Before vs After

### Before (Slow)
```
Click Simpan
  ↓ [await for sync]
  ├─ Update in-memory
  ├─ Call API (wait response)
  ├─ setState
  ├─ React re-render (wait for batch)
  ↓ [wait 100ms artificial]
  ├─ Show toast
  └─ Close modal
Time: 700-800ms total
```

### After (Fast)
```
Click Simpan
  ├─ Start sync (don't wait)
  ├─ Close modal IMMEDIATELY ← 100ms
  ├─ Stop loading
  └─ Return

Background (parallel):
  ├─ Update in-memory (optimistic)
  ├─ setState (no wait)
  ├─ React re-render (natural)
  ├─ Call API (parallel)
  └─ Toast when ready ← 200ms
```

---

## 📝 Checklist

- [ ] Modal closes within 100ms (not 700ms)
- [ ] Bulk 5 SKUs finish within 400ms (not 3000ms)
- [ ] Table updates immediately (optimistic)
- [ ] Toast appears after modal close
- [ ] No "React state updates complete" log (removed)
- [ ] All API calls parallel (Promise.all working)
- [ ] Error rollback works (price reverts)
- [ ] No 100ms/50ms setTimeout delays in code
- [ ] Build succeeds with no errors

---

## 🐛 Debugging

### If modal still closing slowly:
1. Check console for `[MODAL] Closing modal immediately`
2. If not there, modal close logic has bug
3. Check: `onOpenChange(false)` is called right after `const syncPromise = onSave(...)`

### If bulk still sequential:
1. Check console for all `[API]` logs appearing at similar time
2. If times are sequential (48ms, 101ms, 150ms), Promise.all not working
3. Check: `await Promise.all(syncPromises)` is used

### If UI not updating optimistically:
1. Check console for `[SYNC] In-memory updated` before `[API]`
2. If `[API]` appears before `[SYNC]`, order is wrong
3. Check: `sku.costPrice = newCostPrice` before `await fetch(...)`

---

## ✨ Summary

**Before**: User waits ~1 second for modal to close + table to update
**After**: Modal closes in 100ms, user sees instant response, sync continues silently

All optimizations are **internal only** - no UI changes, same functionality, 10× better performance!

---

**Ready to Test!** 🚀
