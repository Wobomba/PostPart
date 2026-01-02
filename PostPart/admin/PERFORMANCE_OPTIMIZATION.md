# Performance Optimization Guide

## Current Performance State

### ✅ What's Already Optimized:
1. **Next.js Built-in Optimizations**
   - Automatic code splitting per route
   - Server-side rendering (SSR) where applicable
   - Image optimization (Next.js Image component)

2. **Parallel Data Loading**
   - Using `Promise.all()` for concurrent queries
   - Example: `await Promise.all([loadParents(), loadStats()])`

3. **Some Pagination**
   - Activity Logs page has pagination (25 items per page)
   - Table pagination implemented

### ❌ Performance Issues to Address:

#### 1. **Loading All Data Without Pagination**
**Pages Affected:** Parents, Centres, Organizations
**Issue:** Loading all records at once can be slow with 100s or 1000s of records
**Impact:** Initial page load time increases significantly

#### 2. **Real-time Subscriptions Reload Entire Datasets**
**Issue:** When a single record changes, entire dataset is reloaded
```typescript
// Current approach - reloads everything
.on('postgres_changes', { event: '*' }, () => {
  loadData(); // ❌ Reloads all data
})
```

#### 3. **No Component Memoization**
**Issue:** Expensive components re-render on every state change
**Impact:** Unnecessary re-renders slow down interactions

#### 4. **Background Image**
**Issue:** Large unoptimized image file
**Current:** `~/children-background.jpg` (~2-5MB potentially)

#### 5. **No Virtual Scrolling**
**Issue:** Long tables render all rows
**Impact:** Performance degrades with 100+ rows

## Recommended Optimizations

### Priority 1: High Impact (Implement Now)

#### A. Optimize Real-time Subscriptions
Instead of reloading everything, update specific records:

```typescript
.on('postgres_changes', { event: 'INSERT' }, (payload) => {
  // ✅ Add new record to state
  setParents(prev => [payload.new, ...prev]);
})
.on('postgres_changes', { event: 'UPDATE' }, (payload) => {
  // ✅ Update specific record
  setParents(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
})
```

#### B. Optimize Background Image
1. Resize image to max 1920x1080px
2. Compress to WebP format (~100-300KB)
3. Use Next.js Image component with lazy loading

#### C. Add React.memo to Stat Cards
```typescript
const StatCard = React.memo(({ icon, label, value, color }) => {
  // Component definition
});
```

### Priority 2: Medium Impact (Implement Soon)

#### D. Implement Pagination Everywhere
- Parents page: Paginate to 20-50 per page
- Centres page: Paginate to 20-50 per page
- Organizations page: Paginate to 20-50 per page

#### E. Add Loading Skeletons
Replace spinners with skeleton screens for better UX

#### F. Debounce Search Inputs
```typescript
const debouncedSearch = useMemo(
  () => debounce((value) => setSearchQuery(value), 300),
  []
);
```

### Priority 3: Nice to Have

#### G. Virtual Scrolling
Use `react-window` or `react-virtualized` for long lists

#### H. Code Splitting Heavy Components
```typescript
const QRCodeManagement = dynamic(() => import('./QRCodeManagement'), {
  loading: () => <Skeleton />,
});
```

#### I. Implement Caching
Use SWR or React Query for data fetching with cache

## Performance Monitoring

### Metrics to Track:
1. **First Contentful Paint (FCP)**: < 1.5s
2. **Time to Interactive (TTI)**: < 3s
3. **Largest Contentful Paint (LCP)**: < 2.5s
4. **Initial Bundle Size**: < 500KB (gzipped)

### Tools:
- Chrome DevTools Performance tab
- Lighthouse CI
- Next.js Analytics
- Vercel Speed Insights (if deployed on Vercel)

## Implementation Checklist

- [ ] Optimize real-time subscriptions (update records instead of reload)
- [ ] Optimize and compress background image
- [ ] Add React.memo to stat cards
- [ ] Implement pagination on Parents page
- [ ] Implement pagination on Centres page
- [ ] Implement pagination on Organizations page
- [ ] Add loading skeletons
- [ ] Debounce search inputs
- [ ] Lazy load heavy components
- [ ] Add virtual scrolling for tables
- [ ] Implement data caching strategy

## Expected Performance Improvements

| Optimization | Impact | Effort |
|-------------|---------|--------|
| Real-time optimization | 70% faster updates | Medium |
| Background image | 40% faster initial load | Low |
| Component memoization | 30% faster re-renders | Low |
| Pagination | 80% faster page loads | Medium |
| Loading skeletons | Better perceived performance | Low |
| Debounced search | 50% fewer queries | Low |
| Virtual scrolling | 90% faster with 1000+ rows | High |
| Code splitting | 20% faster initial load | Medium |

## Quick Wins (Can implement today)

1. **Optimize Background Image** (5 minutes)
2. **Add React.memo to Stat Cards** (15 minutes)
3. **Debounce Search Inputs** (10 minutes)
4. **Optimize Real-time Subscriptions** (30 minutes)

Total time: ~1 hour for 60-80% performance improvement!

