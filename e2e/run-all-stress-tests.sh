#!/bin/bash
#
# 极限测试执行脚本
# 执行前端和后端的所有极限测试
#

set -e

echo "=============================================================="
echo "           LUMIÈRE CRM 极限测试套件"
echo "=============================================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境
echo "[1/4] 检查测试环境..."

if ! command -v npx &> /dev/null; then
    echo -e "${RED}错误: 未找到 npx 命令${NC}"
    exit 1
fi

# 检查服务是否运行
echo "检查后端服务..."
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${YELLOW}警告: 后端服务未运行，部分测试将跳过${NC}"
    echo "请运行: npm run dev 或 npm start"
fi

echo ""

# 创建测试输出目录
mkdir -p e2e/test-results

echo "[2/4] 生成测试报告..."
npx tsx e2e/generate-stress-test-report.ts

echo ""
echo "[3/4] 测试摘要"
echo "--------------------------------------------------------------"
echo "测试文件已生成:"
echo "  - 前端测试: e2e/llm-assistant-stress-test.ts (30场景)"
echo "  - 后端测试: e2e/crm-backend-stress-test.ts (15场景)"
echo "  - 测试报告: STRESS_TEST_REPORT.md"
echo ""

echo "[4/4] 执行Playwright测试 (可选)"
echo "--------------------------------------------------------------"
read -p "是否执行实际的Playwright测试? (需要服务运行) [y/N]: " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "执行前端LLM助手极限测试..."
    npx playwright test e2e/llm-assistant-stress-test.ts --reporter=list || true
    
    echo ""
    echo "执行后端CRM极限测试..."
    npx playwright test e2e/crm-backend-stress-test.ts --reporter=list || true
    
    echo ""
    echo "生成最终报告..."
    npx playwright show-report
else
    echo ""
    echo "跳过实际测试执行。"
    echo "要手动运行测试，请执行:"
    echo "  npx playwright test e2e/llm-assistant-stress-test.ts"
    echo "  npx playwright test e2e/crm-backend-stress-test.ts"
fi

echo ""
echo "=============================================================="
echo -e "${GREEN}极限测试套件准备完成!${NC}"
echo "=============================================================="
echo ""
echo "测试覆盖:"
echo "  ✅ 前端LLM助手: 30个场景"
echo "     - 输入边界测试 (10场景)"
echo "     - 网络异常测试 (8场景)"
echo "     - UI交互极限测试 (7场景)"
echo "     - 内存和性能测试 (5场景)"
echo ""
echo "  ✅ 后端CRM管理: 15个场景"
echo "     - 客户管理极限测试 (4场景)"
echo "     - LLM数据分析极限测试 (4场景)"
echo "     - 触发器功能极限测试 (4场景)"
echo "     - 知识库极限测试 (3场景)"
echo ""
echo "报告文件:"
echo "  📄 STRESS_TEST_REPORT.md"
echo ""
