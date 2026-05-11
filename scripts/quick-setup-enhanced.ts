#!/usr/bin/env tsx

/**
 * 快速设置脚本
 * 用于集成增强功能到现有项目
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SetupConfig {
  installDependencies: boolean;
  updateDatabase: boolean;
  integrateRoutes: boolean;
  seedContent: boolean;
}

class QuickSetup {
  private projectRoot: string;
  private packageJson: any;

  constructor() {
    this.projectRoot = process.cwd();
    this.loadPackageJson();
  }

  private loadPackageJson() {
    try {
      const packagePath = join(this.projectRoot, 'package.json');
      this.packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    } catch (error) {
      console.error('❌ 无法读取 package.json:', error);
      process.exit(1);
    }
  }

  /**
   * 执行完整设置
   */
  async setup(config: Partial<SetupConfig> = {}): Promise<void> {
    console.log('🚀 开始快速设置增强功能...\n');

    const finalConfig: SetupConfig = {
      installDependencies: true,
      updateDatabase: true,
      integrateRoutes: true,
      seedContent: true,
      ...config
    };

    try {
      // 1. 安装依赖
      if (finalConfig.installDependencies) {
        await this.installDependencies();
      }

      // 2. 更新数据库
      if (finalConfig.updateDatabase) {
        await this.updateDatabase();
      }

      // 3. 集成路由
      if (finalConfig.integrateRoutes) {
        await this.integrateRoutes();
      }

      // 4. 填充内容
      if (finalConfig.seedContent) {
        await this.seedContent();
      }

      console.log('\n✅ 设置完成！');
      console.log('\n📋 下一步操作：');
      console.log('1. 启动开发服务器: npm run dev');
      console.log('2. 访问知识库: /dashboard/knowledge-tree');
      console.log('3. 测试搜索功能');
      console.log('4. 检查移动端体验');

    } catch (error) {
      console.error('\n❌ 设置失败:', error);
      process.exit(1);
    }
  }

  /**
   * 安装必要的依赖包
   */
  private async installDependencies(): Promise<void> {
    console.log('📦 安装依赖包...');

    const dependencies = [
      'openai',
      '@types/node',
      'lucide-react'
    ];

    try {
      execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
      console.log('✅ 依赖包安装完成');
    } catch (error) {
      console.error('❌ 依赖包安装失败:', error);
      throw error;
    }
  }

  /**
   * 更新数据库schema
   */
  private async updateDatabase(): Promise<void> {
    console.log('🗄️ 更新数据库schema...');

    try {
      // 检查是否需要添加向量嵌入字段
      execSync('npm run db:push', { stdio: 'inherit' });
      console.log('✅ 数据库更新完成');
    } catch (error) {
      console.error('❌ 数据库更新失败:', error);
      console.log('💡 请手动运行: npm run db:push');
      throw error;
    }
  }

  /**
   * 集成新路由到主router
   */
  private async integrateRoutes(): Promise<void> {
    console.log('🔗 集成路由...');

    try {
      const routerPath = join(this.projectRoot, 'server', '_core', 'router.ts');
      
      if (!existsSync(routerPath)) {
        console.log('⚠️  主路由文件不存在，跳过路由集成');
        console.log('💡 请手动集成以下路由：');
        console.log('   - vectorSearchRouter from ../routers/vector-search-simple');
        console.log('   - adaptiveLearningRouter from ../routers/adaptive-learning');
        return;
      }

      let routerContent = readFileSync(routerPath, 'utf-8');
      
      // 检查是否已经集成了新路由
      if (routerContent.includes('vectorSearchRouter')) {
        console.log('✅ 路由已经集成，跳过');
        return;
      }

      // 添加导入语句
      const importSection = `
import { vectorSearchRouter } from '../routers/vector-search-simple';
import { adaptiveLearningRouter } from '../routers/adaptive-learning';`;

      // 添加路由合并
      const routerMerge = `
  app.merge('/vector-search', vectorSearchRouter);
  app.merge('/adaptive-learning', adaptiveLearningRouter);`;

      // 更新文件内容
      routerContent = routerContent.replace(
        /import.*from.*trpc.*;/,
        match => match + importSection
      );

      routerContent = routerContent.replace(
        /app\.merge.*knowledge.*;/,
        match => match + routerMerge
      );

      writeFileSync(routerPath, routerContent);
      console.log('✅ 路由集成完成');

    } catch (error) {
      console.error('❌ 路由集成失败:', error);
      console.log('💡 请手动集成新路由到主router');
      throw error;
    }
  }

  /**
   * 填充示例内容
   */
  private async seedContent(): Promise<void> {
    console.log('🌱 填充示例内容...');

    try {
      execSync('npx tsx scripts/seed-enhanced-knowledge.ts', { stdio: 'inherit' });
      console.log('✅ 内容填充完成');
    } catch (error) {
      console.error('❌ 内容填充失败:', error);
      console.log('💡 请手动运行: npx tsx scripts/seed-enhanced-knowledge.ts');
      throw error;
    }
  }

  /**
   * 验证设置
   */
  async verify(): Promise<void> {
    console.log('🔍 验证设置...');

    const checks = [
      {
        name: '依赖包检查',
        check: () => {
          const deps = ['openai', '@types/node', 'lucide-react'];
          return deps.every(dep => 
            this.packageJson.dependencies?.[dep] || 
            this.packageJson.devDependencies?.[dep]
          );
        }
      },
      {
        name: '文件存在性检查',
        check: () => {
          const files = [
            'shared/enhanced-content-templates.ts',
            'shared/content-quality-control.ts',
            'server/routers/vector-search-simple.ts',
            'server/routers/adaptive-learning.ts',
            'client/src/components/MobileOptimizedKnowledgeTree.tsx'
          ];
          return files.every(file => existsSync(join(this.projectRoot, file)));
        }
      },
      {
        name: '环境变量检查',
        check: () => {
          return !!process.env.OPENAI_API_KEY || !!process.env.DATABASE_URL;
        }
      }
    ];

    let allPassed = true;

    for (const { name, check } of checks) {
      try {
        const passed = check();
        console.log(`${passed ? '✅' : '❌'} ${name}`);
        if (!passed) allPassed = false;
      } catch (error) {
        console.log(`❌ ${name} (检查失败)`);
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log('\n🎉 所有检查通过！');
    } else {
      console.log('\n⚠️  部分检查未通过，请检查上述问题');
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp(): void {
    console.log(`
🚀 美业知识库平台快速设置

用法:
  npx tsx scripts/quick-setup-enhanced.ts [选项]

选项:
  --no-deps      跳过依赖安装
  --no-db        跳过数据库更新
  --no-routes    跳过路由集成
  --no-seed      跳过内容填充
  --verify-only  仅执行验证检查
  --help         显示帮助信息

示例:
  npx tsx scripts/quick-setup-enhanced.ts              # 完整设置
  npx tsx scripts/quick-setup-enhanced.ts --no-deps    # 跳过依赖安装
  npx tsx scripts/quick-setup-enhanced.ts --verify-only # 仅验证

环境要求:
  - Node.js 16+
  - PostgreSQL 数据库
  - OPENAI_API_KEY 环境变量 (可选，用于向量搜索)

注意事项:
  - 确保数据库连接正常
  - 建议在开发环境先测试
  - 备份现有数据后再执行
`);
  }
}

// 主执行逻辑
async function main() {
  const setup = new QuickSetup();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    setup.showHelp();
    return;
  }

  if (args.includes('--verify-only')) {
    await setup.verify();
    return;
  }

  const config: Partial<SetupConfig> = {
    installDependencies: !args.includes('--no-deps'),
    updateDatabase: !args.includes('--no-db'),
    integrateRoutes: !args.includes('--no-routes'),
    seedContent: !args.includes('--no-seed'),
  };

  await setup.setup(config);
  await setup.verify();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 设置失败:', error);
    process.exit(1);
  });
}

export { QuickSetup };
