import { spawn } from 'child_process';
import { writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';

export interface EmbeddingConfig {
  modelPath: string;
  dimension: number;
  maxTokens?: number;
  backend?: 'llamacpp' | 'ollama';
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  duration: number;
}

class LocalEmbeddingService {
  private config: EmbeddingConfig;
  private modelReady: boolean = false;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // 检查模型文件是否存在
    try {
      await access(this.config.modelPath);
      this.modelReady = true;
      console.log(`✅ Embedding model loaded: ${this.config.modelPath}`);
    } catch (error) {
      throw new Error(`Embedding model not found: ${this.config.modelPath}`);
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.modelReady) {
      throw new Error('Embedding service not initialized');
    }

    const startTime = Date.now();
    
    try {
      switch (this.config.backend) {
        case 'llamacpp':
          return await this.generateWithLlamaCpp(text);
        case 'ollama':
          return await this.generateWithOllama(text);
        default:
          throw new Error(`Unsupported backend: ${this.config.backend}`);
      }
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  private async generateWithLlamaCpp(text: string): Promise<EmbeddingResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // llama.cpp embedding 命令
      const args = [
        '-m', this.config.modelPath,
        '--embedding',
        '--prompt', text.trim(),
        '--silent'
      ];
      
      if (this.config.maxTokens) {
        args.push('--ctx-size', this.config.maxTokens.toString());
      }

      const llamaProcess = spawn('./llama-embedding', args, {
        cwd: '/tmp/llama.cpp',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      llamaProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      llamaProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      llamaProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code !== 0) {
          reject(new Error(`llama.cpp process failed: ${stderr}`));
          return;
        }

        try {
          // 解析 embedding 数组 (假设输出为 JSON 格式)
          const lines = stdout.trim().split('\n');
          let embeddingLine = '';
          
          // 寻找包含 embedding 的行
          for (const line of lines) {
            if (line.includes('[') && line.includes(']')) {
              embeddingLine = line.trim();
              break;
            }
          }
          
          if (!embeddingLine) {
            throw new Error('No embedding data found in output');
          }
          
          const embedding = JSON.parse(embeddingLine);
          
          if (!Array.isArray(embedding) || embedding.length !== this.config.dimension) {
            throw new Error(`Invalid embedding dimension: expected ${this.config.dimension}, got ${embedding.length}`);
          }

          resolve({
            embedding,
            tokens: text.split(/\s+/).length, // 简单的 token 计算
            duration
          });
        } catch (parseError) {
          reject(new Error(`Failed to parse embedding output: ${parseError}`));
        }
      });

      llamaProcess.on('error', (error) => {
        reject(new Error(`Failed to start llama.cpp: ${error.message}`));
      });
    });
  }

  private async generateWithOllama(text: string): Promise<EmbeddingResult> {
    // Ollama API 调用 (本地服务)
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.modelPath,
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      return {
        embedding: data.embedding,
        tokens: text.split(/\s+/).length,
        duration
      };
    } catch (error) {
      throw new Error(`Ollama embedding failed: ${error}`);
    }
  }

  async batchGenerateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (const text of texts) {
      try {
        const result = await this.generateEmbedding(text);
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate embedding for text: ${text.slice(0, 100)}...`, error);
        // 继续处理其他文本，不中断批处理
        results.push({
          embedding: new Array(this.config.dimension).fill(0),
          tokens: 0,
          duration: 0
        });
      }
    }
    
    return results;
  }

  isReady(): boolean {
    return this.modelReady;
  }

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }
}

// 预设配置
export const EMBEDDING_CONFIGS = {
  // 基于 sentence-transformers 的轻量级模型 (384 维)
  miniLM: {
    modelPath: '/tmp/llama.cpp/models/all-MiniLM-L6-v2.gguf',
    dimension: 384,
    backend: 'llamacpp' as const,
    maxTokens: 512
  },
  
  // BGE 中文优化模型 (768 维)
  bgeBase: {
    modelPath: '/tmp/llama.cpp/models/bge-base-zh-v1.5.gguf', 
    dimension: 768,
    backend: 'llamacpp' as const,
    maxTokens: 512
  },
  
  // OpenAI Ada 兼容维度 (1536 维)
  ada002: {
    modelPath: '/tmp/llama.cpp/models/text-embedding-ada-002.gguf',
    dimension: 1536,
    backend: 'llamacpp' as const,
    maxTokens: 8192
  }
};

// 全局 embedding 服务实例
let embeddingService: LocalEmbeddingService | null = null;

export async function initializeEmbeddingService(configName: keyof typeof EMBEDDING_CONFIGS = 'miniLM'): Promise<LocalEmbeddingService> {
  const config = EMBEDDING_CONFIGS[configName];
  
  if (!config) {
    throw new Error(`Unknown embedding config: ${configName}`);
  }
  
  embeddingService = new LocalEmbeddingService(config);
  await embeddingService.initialize();
  
  return embeddingService;
}

export function getEmbeddingService(): LocalEmbeddingService {
  if (!embeddingService) {
    throw new Error('Embedding service not initialized. Call initializeEmbeddingService() first.');
  }
  return embeddingService;
}

// 便捷函数
export async function generateEmbedding(text: string): Promise<number[]> {
  const service = getEmbeddingService();
  const result = await service.generateEmbedding(text);
  return result.embedding;
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const service = getEmbeddingService();
  const results = await service.batchGenerateEmbeddings(texts);
  return results.map(r => r.embedding);
}