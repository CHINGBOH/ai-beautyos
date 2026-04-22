#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { join } from 'path';
import postgres from 'postgres';

config();

export interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  category: string;
  module: string;
  tags: string;
  quality_score: number;
  is_active: number;
  used_count: number;
  positive_evidence: string;
  negative_evidence: string;
  created_at: string;
  updated_at: string;
}

export async function insertKnowledgeFromJson(): Promise<void> {
  try {
    const dataPath = join(process.cwd(), 'data', 'knowledge_base.json');
    const jsonContent = await readFile(dataPath, 'utf-8');
    const knowledgeItems: KnowledgeItem[] = JSON.parse(jsonContent);
    
    if (knowledgeItems.length === 0) {
      console.log('No knowledge items to insert');
      return;
    }
    
    // 直接连接 PostgreSQL
    const sql = postgres({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'beauty_crm',
      username: process.env.DB_USER || 'beauty_user',
      password: process.env.DB_PASSWORD || 'beauty_pass123'
    });
    
    console.log(`Loading ${knowledgeItems.length} knowledge items...`);
    
    for (const item of knowledgeItems) {
      try {
        // 检查是否已存在
        const existing = await sql`SELECT id FROM knowledge_base WHERE id = ${item.id}`;
        
        if (existing.length > 0) {
          console.log(`Knowledge item ${item.id} already exists, skipping`);
          continue;
        }
        
        // 插入新记录
        await sql`
          INSERT INTO knowledge_base (
            id, title, content, category, module, tags,
            quality_score, is_active, used_count,
            positive_evidence, negative_evidence,
            created_at, updated_at
          ) VALUES (
            ${item.id}, ${item.title}, ${item.content}, ${item.category}, ${item.module}, ${item.tags},
            ${item.quality_score}, ${item.is_active}, ${item.used_count},
            ${item.positive_evidence}, ${item.negative_evidence},
            ${item.created_at}, ${item.updated_at}
          )
        `;
        
        console.log(`✅ Inserted knowledge item ${item.id}: ${item.title}`);
        
      } catch (insertError) {
        if (insertError.message.includes('duplicate key')) {
          console.log(`Knowledge item ${item.id} already exists`);
        } else {
          console.error(`Failed to insert knowledge item ${item.id}:`, insertError);
          throw insertError;
        }
      }
    }
    
    await sql.end();
    console.log('✅ Knowledge base data loaded successfully');
    
  } catch (error) {
    console.error('Failed to load knowledge base data:', error);
    throw error;
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  insertKnowledgeFromJson()
    .then(() => {
      console.log('Knowledge base loading completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Knowledge base loading failed:', error);
      process.exit(1);
    });
}