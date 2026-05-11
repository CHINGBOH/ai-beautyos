# Xiaohongshu Improvements - Quick Start Guide

## 🚀 Quick Start

### 1. Setup Database
```bash
# Run database migrations
npm run db:push

# Seed medical projects
npx tsx scripts/seed-medical-projects.ts
```

### 2. Test Caching
```bash
# Generate content twice - second time should be from cache
curl -X POST http://localhost:3000/api/trpc/content.generate \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "type": "project",
      "project": "超皮秒祛斑",
      "useCache": true
    }
  }'
```

### 3. Test Rate Limiting
```bash
# Make 11 requests rapidly - 11th should fail
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/trpc/content.generate \
    -H "Content-Type: application/json" \
    -d '{"json":{"type":"project","project":"超皮秒祛斑"}}' \
    echo ""
done
```

### 4. Test Content Validation
```bash
# Generate with poor quality content
curl -X POST http://localhost:3000/api/trpc/content.analyzeQuality \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "title": "短标题",
      "content": "短内容",
      "tags": []
    }
  }'
```

### 5. Test Project List
```bash
# Get dynamic project list
curl http://localhost:3000/api/trpc/content.getProjects
```

## 📊 Monitoring Commands

### Check Cache Stats
```typescript
// Add this to your admin dashboard
import { getLLMCacheStats } from './server/_core/llmWithRetry';

const stats = getLLMCacheStats();
console.log('Cache size:', stats.size);
console.log('Cache keys:', stats.keys);
```

### Check Rate Limit Usage
```typescript
import { contentGenerationLimiter } from './server/_core/rateLimiter';

const usage = contentGenerationLimiter.getUsage(userId);
console.log('Remaining:', usage.remaining);
console.log('Reset at:', new Date(usage.resetAt));
```

## 🧪 Test Scenarios

### Scenario 1: Cache Hit
1. Generate content for "超皮秒祛斑" with `useCache: true`
2. Note the response time and `fromCache: false`
3. Generate the same content again
4. Verify `fromCache: true` and faster response time

### Scenario 2: Rate Limit Exceeded
1. Make 10 rapid content generation requests
2. All should succeed
3. Make 11th request
4. Should receive rate limit error
5. Wait 1 minute
6. Request should succeed again

### Scenario 3: Content Quality
1. Generate content with AI
2. Check `validation.score` (should be > 70)
3. Check `suggestions` array
4. Try generating with different parameters
5. Compare quality scores

### Scenario 4: Content History
1. Generate content
2. Note the `postId`
3. Generate again for same post
4. Check history: `trpc.content.getHistory({ postId })`
5. Should see multiple versions

### Scenario 5: Dynamic Projects
1. Call `content.getProjects()`
2. Should return 8 projects
3. Add new project to database
4. Call again - should include new project

## 🔍 Debugging

### Enable Debug Logging
```typescript
// In server/_core/logger.ts
export const logger = {
  info: (msg: string, ...args: any[]) => {
    console.log(`[INFO] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(`[WARN] ${msg}`, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[ERROR] ${msg}`, ...args);
  },
};
```

### Clear Cache
```typescript
import { clearLLMCache } from './server/_core/llmWithRetry';

// Clear specific key
clearLLMCache('some-key');

// Clear all cache
clearLLMCache();
```

### Reset Rate Limit
```typescript
import { contentGenerationLimiter } from './server/_core/rateLimiter';

contentGenerationLimiter.reset(userId);
```

## 📈 Performance Benchmarks

### Expected Performance
- **First generation (no cache):** 2-5 seconds
- **Cached generation:** <100 milliseconds
- **Rate limit window:** 60 seconds
- **Content validation:** <10 milliseconds

### How to Measure
```typescript
const start = Date.now();
const result = await trpc.content.generate.mutate({...});
const duration = Date.now() - start;
console.log(`Generation took ${duration}ms`);
console.log(`From cache: ${result.fromCache}`);
```

## 🐛 Common Issues

### Issue: Cache Not Working
**Solution:** Check that `useCache: true` is passed in the request

### Issue: Rate Limit Too Strict
**Solution:** Adjust limits in `server/_core/rateLimiter.ts`

### Issue: Validation Too Strict
**Solution:** Adjust rules in `server/_core/contentValidator.ts`

### Issue: Projects Not Showing
**Solution:** Run seed script: `npx tsx scripts/seed-medical-projects.ts`

## 📝 Checklist

- [ ] Database migrations completed
- [ ] Medical projects seeded
- [ ] Cache working (test with duplicate requests)
- [ ] Rate limiting working (test with 11+ requests)
- [ ] Content validation working (check scores)
- [ ] Content history tracking working (check versions)
- [ ] Pagination working (check comments)
- [ ] Dynamic projects loading (check project list)
- [ ] Analytics tracking (check logs)

## 🎯 Next Steps

1. **Integrate Enhanced Router**
   - Replace `contentRouter` with `contentRouterEnhanced` in `server/routers.ts`

2. **Update Frontend**
   - Display quality scores
   - Show validation warnings
   - Add cache indicators
   - Implement pagination UI

3. **Monitor Performance**
   - Track cache hit rate
   - Monitor API costs
   - Measure response times
   - Analyze quality scores

4. **Gather Feedback**
   - User satisfaction surveys
   - A/B test different prompts
   - Analyze engagement metrics
   - Iterate on validation rules

---

**Happy Testing! 🚀**
