#!/usr/bin/env python3
"""
简单的 embedding 生成器
使用基本的文本向量化技术作为 llama.cpp 的临时替代方案
"""

import json
import hashlib
import re
from typing import List, Dict, Any
from pathlib import Path
import sys

def clean_text(text: str) -> str:
    """清理和标准化文本"""
    # 移除多余的空白字符
    text = re.sub(r'\s+', ' ', text.strip())
    # 转为小写
    text = text.lower()
    return text

def text_to_hash_vector(text: str, dimension: int = 128) -> List[float]:
    """
    将文本转换为固定维度的向量
    使用多个哈希函数生成向量分量
    """
    clean = clean_text(text)
    vector = []
    
    # 使用多种哈希算法和种子
    hash_methods = ['md5', 'sha1', 'sha256']
    seeds = list(range(0, dimension // len(hash_methods) + 1))
    
    for method in hash_methods:
        for seed in seeds:
            if len(vector) >= dimension:
                break
            
            # 创建带种子的文本
            seeded_text = f"{seed}:{clean}"
            
            # 计算哈希值
            if method == 'md5':
                hash_obj = hashlib.md5(seeded_text.encode())
            elif method == 'sha1':
                hash_obj = hashlib.sha1(seeded_text.encode())
            else:  # sha256
                hash_obj = hashlib.sha256(seeded_text.encode())
            
            # 从哈希值生成向量分量
            hex_str = hash_obj.hexdigest()
            # 取前8个字符，转换为浮点数
            try:
                component = int(hex_str[:8], 16) / (16**8)  # 规范化到[0,1]
                # 转换到[-1,1]
                component = (component - 0.5) * 2
                vector.append(component)
            except:
                vector.append(0.0)
        
        if len(vector) >= dimension:
            break
    
    # 确保向量长度正确
    if len(vector) < dimension:
        vector.extend([0.0] * (dimension - len(vector)))
    elif len(vector) > dimension:
        vector = vector[:dimension]
    
    return vector

def generate_embeddings_for_knowledge_base():
    """为知识库数据生成 embeddings"""
    
    # 读取知识库数据
    kb_path = Path(__file__).parent.parent / 'data' / 'knowledge_base.json'
    
    try:
        with open(kb_path, 'r', encoding='utf-8') as f:
            knowledge_items = json.load(f)
    except Exception as e:
        print(f"❌ 无法读取知识库文件: {e}")
        return
    
    print(f"📚 Processing {len(knowledge_items)} knowledge items...")
    
    embeddings_data = []
    
    for item in knowledge_items:
        # 合并标题和内容作为输入文本
        combined_text = f"{item['title']}. {item['content']}"
        
        # 生成 embedding
        embedding = text_to_hash_vector(combined_text, dimension=128)
        
        embeddings_data.append({
            'id': item['id'],
            'title': item['title'],
            'text': combined_text,
            'embedding': embedding,
            'dimension': len(embedding)
        })
        
        print(f"✅ Generated embedding for item {item['id']}: {item['title'][:40]}...")
    
    # 保存 embeddings 数据
    output_path = Path(__file__).parent.parent / 'data' / 'embeddings.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(embeddings_data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 Saved embeddings to {output_path}")
    return embeddings_data

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """计算两个向量的余弦相似度"""
    if len(vec1) != len(vec2):
        return 0.0
    
    # 计算点积
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    
    # 计算向量长度
    magnitude_a = sum(a * a for a in vec1) ** 0.5
    magnitude_b = sum(b * b for b in vec2) ** 0.5
    
    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0
    
    return dot_product / (magnitude_a * magnitude_b)

def search_similar_embeddings(query: str, embeddings_data: List[Dict], top_k: int = 5):
    """搜索相似的 embeddings"""
    
    # 为查询生成 embedding
    query_embedding = text_to_hash_vector(query, dimension=128)
    
    # 计算相似度
    similarities = []
    for item in embeddings_data:
        similarity = cosine_similarity(query_embedding, item['embedding'])
        similarities.append({
            'id': item['id'],
            'title': item['title'],
            'similarity': similarity
        })
    
    # 按相似度排序
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    
    return similarities[:top_k]

if __name__ == '__main__':
    print("🚀 Simple Embedding Generator")
    print("=" * 50)
    
    # 生成 embeddings
    embeddings_data = generate_embeddings_for_knowledge_base()
    
    if not embeddings_data:
        sys.exit(1)
    
    print("\n🔍 Testing similarity search:")
    print("-" * 30)
    
    # 测试查询
    test_queries = [
        '超皮秒祛斑',
        '面部填充',
        '紧致提升',
        '补水嫩肤',
        '激光治疗'
    ]
    
    for query in test_queries:
        print(f"\n查询: '{query}'")
        results = search_similar_embeddings(query, embeddings_data, top_k=3)
        
        for i, result in enumerate(results, 1):
            print(f"  {i}. [{result['similarity']:.3f}] {result['title']}")
    
    print("\n✨ Basic embedding generation completed!")