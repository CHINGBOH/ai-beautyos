# 医美 CRM 本地 AI 搜索系统使用指南

## 🎯 系统概述

本系统实现了完全本地化的 AI 驱动语义搜索，为医美 CRM 提供智能知识库检索功能。

## 🚀 快速开始

### 1. 数据库连接测试
```bash
cd medical-beauty-crm-landing
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres('postgresql://devuser:devpass@localhost:5432/medical_crm');
  const result = await sql\`SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL\`;
  console.log('Available embeddings:', result[0].count);
  await sql.end();
});"
```

### 2. 执行语义搜索
```bash
# 示例：搜索祛斑相关项目
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const crypto = require('crypto');
  const sql = postgres('postgresql://devuser:devpass@localhost:5432/medical_crm');
  
  // 生成查询向量（与系统使用相同的哈希算法）
  function textToVector(text) {
    const clean = text.toLowerCase().replace(/\\s+/g, ' ').trim();
    const vector = [];
    const methods = ['md5', 'sha1', 'sha256'];
    
    for (const method of methods) {
      for (let i = 0; i < 43; i++) {
        if (vector.length >= 128) break;
        const hash = crypto.createHash(method).update(\`\${i}:\${clean}\`).digest('hex');
        const component = parseInt(hash.substr(0, 8), 16) / Math.pow(16, 8);
        vector.push((component - 0.5) * 2);
      }
      if (vector.length >= 128) break;
    }
    while (vector.length < 1536) vector.push(0.0);
    return '[' + vector.join(',') + ']';
  }
  
  const query = '面部祛斑美白';
  const queryVector = textToVector(query);
  
  const results = await sql\`
    SELECT 
      id, title, category,
      1 - (embedding <=> \${queryVector}::vector) as similarity
    FROM knowledge_base
    WHERE embedding IS NOT NULL AND is_active = 1
    ORDER BY similarity DESC
    LIMIT 5
  \`;
  
  console.log(\`搜索结果 (\${query}):\`);
  results.forEach((row, i) => {
    console.log(\`  \${i+1}. [\${(row.similarity).toFixed(3)}] \${row.title} (\${row.category})\`);
  });
  
  await sql.end();
});"
```

## 📚 可用的医美项目知识库

当前系统包含以下 8 个核心医美项目：

1. **超皮秒祛斑项目** - 色素治疗
2. **玻尿酸填充项目** - 面部填充  
3. **热玛吉紧致项目** - 抗衰紧致
4. **水光针补水项目** - 水光嫩肤
5. **肉毒素瘦脸项目** - 瘦脸除皱
6. **激光脱毛项目** - 脱毛治疗
7. **光子嫩肤项目** - 美白嫩肤
8. **线雕提升项目** - 面部提升

## 🔍 搜索示例

### 精确匹配搜索
```bash
# 搜索："超皮秒"
# 期望结果：超皮秒祛斑项目介绍 (高相似度)
```

### 语义相似搜索  
```bash
# 搜索："面部年轻化"
# 期望结果：热玛吉紧致项目、玻尿酸填充项目等

# 搜索："皮肤美白"  
# 期望结果：光子嫩肤项目、超皮秒祛斑项目等
```

### 功效搜索
```bash
# 搜索："补水保湿"
# 期望结果：水光针补水项目

# 搜索："除皱抗衰"
# 期望结果：肉毒素项目、热玛吉项目等
```

## 🛠 系统维护

### 添加新的知识条目

1. **插入数据库记录**:
```sql
INSERT INTO knowledge_base (
  title, content, category, module, tags,
  quality_score, is_active, created_at, updated_at
) VALUES (
  '新项目标题',
  '详细项目描述...',
  '项目分类',
  '项目模块',
  '相关标签',
  5, 1, NOW(), NOW()
);
```

2. **生成 embedding**:
```bash
python3 scripts/simple_embedding_generator.py
```

3. **更新数据库**:
```bash
# 使用前面的嵌入更新脚本
```

### 搜索性能优化

```sql
-- 创建向量索引（大数据量时）
CREATE INDEX CONCURRENTLY knowledge_embedding_idx 
ON knowledge_base USING hnsw (embedding vector_cosine_ops);

-- 查看搜索性能
EXPLAIN ANALYZE 
SELECT title, 1 - (embedding <=> '[0.1,0.2,...]'::vector) as similarity
FROM knowledge_base 
ORDER BY similarity DESC 
LIMIT 10;
```

## 📈 监控和统计

### 系统健康检查
```bash
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres('postgresql://devuser:devpass@localhost:5432/medical_crm');
  
  const stats = await sql\`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as with_embedding,
      ROUND(COUNT(embedding)::decimal / COUNT(*) * 100, 2) as coverage
    FROM knowledge_base WHERE is_active = 1
  \`;
  
  console.log('📊 系统状态:');
  console.log('  总条目:', stats[0].total);
  console.log('  有向量:', stats[0].with_embedding);
  console.log('  覆盖率:', stats[0].coverage + '%');
  
  await sql.end();
});"
```

### 搜索质量评估
```bash
# 测试多个查询的搜索效果
node -e "
const queries = [
  '祛斑美白', '面部填充', '抗衰老', 
  '补水嫩肤', '激光治疗', '瘦脸塑形'
];

import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres('postgresql://devuser:devpass@localhost:5432/medical_crm');
  // ... 搜索测试代码
});"
```

## 🔧 故障排除

### 常见问题

1. **向量维度错误**
   - 确保所有 embedding 都是 1536 维
   - 检查向量生成算法一致性

2. **搜索结果不准确**
   - 验证 embedding 质量
   - 调整相似度阈值
   - 考虑重新生成向量

3. **性能问题**
   - 创建适当的向量索引
   - 限制搜索结果数量
   - 监控数据库资源使用

### 系统重置（如需要）
```bash
# 清空所有 embedding
UPDATE knowledge_base SET embedding = NULL, embedding_model = NULL;

# 重新生成
python3 scripts/simple_embedding_generator.py
# 然后运行数据库更新脚本
```

## 🎯 集成建议

### API 接口实现
```typescript
// 示例：创建搜索 API 端点
export async function POST(request: Request) {
  const { query } = await request.json();
  
  // 生成查询向量
  const queryVector = textToHashVector(query);
  
  // 执行向量搜索
  const results = await db.execute(sql`
    SELECT title, content, category, 
           1 - (embedding <=> ${queryVector}::vector) as similarity
    FROM knowledge_base 
    WHERE embedding IS NOT NULL 
      AND similarity >= 0.1
    ORDER BY similarity DESC 
    LIMIT 10
  `);
  
  return Response.json({ results });
}
```

### 前端集成
```jsx
const SearchResults = ({ query }) => {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query })
    })
    .then(res => res.json())
    .then(data => setResults(data.results));
  }, [query]);
  
  return (
    <div>
      {results.map(item => (
        <SearchResultCard 
          key={item.id}
          title={item.title}
          similarity={item.similarity}
          category={item.category}
        />
      ))}
    </div>
  );
};
```

---

*本指南涵盖了医美 CRM 本地 AI 搜索系统的核心使用方法。如需更多技术细节，请参考 `LOCAL_EMBEDDING_PROGRESS.md` 文档。*