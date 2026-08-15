/**
 * AI BeautyOS — Agent-Native 美业数字化与智能 CRM 操作系统
 * 
 * 核心主入口：
 * - API / Web Server: ./server/_core/index.ts
 * - Hermes Tool Server: ./server/tool-server-main.ts
 * - Client Web App: ./client/src/main.tsx
 */

import { startServer } from './server/_core/index';

async function main() {
  console.log('🚀 Starting AI BeautyOS Core Server & Agent Runtime...');
  await startServer();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error during AI BeautyOS startup:', err);
    process.exit(1);
  });
}

export { main };
