/**
 * 移动端优化的知识库树形组件
 * 适配移动设备的触摸交互和小屏幕显示
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, BookOpen, Clock, Star, Search, Filter, Home } from 'lucide-react';
import { KNOWLEDGE_MODULES, MODULE_NAMES } from '../../shared/knowledge-modules';

interface MobileKnowledgeNode {
  id: string;
  title: string;
  summary?: string;
  module: string;
  difficulty: string;
  credibility: number;
  viewCount: number;
  children?: MobileKnowledgeNode[];
  level: number;
  isExpanded?: boolean;
  estimatedReadTime?: number;
  thumbnail?: string;
}

interface MobileKnowledgeTreeProps {
  initialData?: MobileKnowledgeNode[];
  selectedModule?: string;
  onNodeSelect?: (node: MobileKnowledgeNode) => void;
  onSearch?: (query: string) => void;
  onFilter?: (filters: any) => void;
  loading?: boolean;
}

export const MobileOptimizedKnowledgeTree: React.FC<MobileKnowledgeTreeProps> = ({
  initialData = [],
  selectedModule,
  onNodeSelect,
  onSearch,
  onFilter,
  loading = false,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<MobileKnowledgeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentModule, setCurrentModule] = useState(selectedModule || 'all');
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  // 模块选项
  const moduleOptions = [
    { value: 'all', label: '全部模块', icon: Home },
    ...Object.entries(MODULE_NAMES).map(([key, name]) => ({
      value: key,
      label: name,
      icon: BookOpen,
    })),
  ];

  // 处理节点展开/收起
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // 处理节点选择
  const handleNodeSelect = (node: MobileKnowledgeNode) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
    
    // 移动端自动展开子节点
    if (node.children && node.children.length > 0) {
      toggleNodeExpansion(node.id);
    }
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      onSearch?.(query);
    }
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent, node: MobileKnowledgeNode) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  // 处理触摸结束
  const handleTouchEnd = (e: React.TouchEvent, node: MobileKnowledgeNode) => {
    if (!touchStart) return;

    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const deltaX = Math.abs(touchEnd.x - touchStart.x);
    const deltaY = Math.abs(touchEnd.y - touchStart.y);

    // 如果是短距离触摸，视为点击
    if (deltaX < 10 && deltaY < 10) {
      handleNodeSelect(node);
    }

    setTouchStart(null);
  };

  // 渲染单个节点
  const renderNode = (node: MobileKnowledgeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    const marginLeft = depth * 16; // 移动端缩进更小

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200
            ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
            ${depth === 0 ? 'bg-white shadow-sm' : ''}
          `}
          style={{ marginLeft: `${marginLeft}px` }}
          onTouchStart={(e) => handleTouchStart(e, node)}
          onTouchEnd={(e) => handleTouchEnd(e, node)}
        >
          {/* 展开/收起图标 */}
          {hasChildren && (
            <div className="mr-2 p-1">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}

          {/* 缩略图 */}
          {node.thumbnail && (
            <div className="mr-3 flex-shrink-0">
              <img
                src={node.thumbnail}
                alt={node.title}
                className="w-10 h-10 rounded-lg object-cover"
              />
            </div>
          )}

          {/* 主要内容 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate text-sm">
              {node.title}
            </h3>
            {node.summary && depth === 0 && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {node.summary}
              </p>
            )}
            
            {/* 元信息 */}
            <div className="flex items-center mt-1 space-x-3 text-xs text-gray-400">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {node.estimatedReadTime || 5}分钟
              </div>
              <div className="flex items-center">
                <Star className="w-3 h-3 mr-1" />
                {node.credibility}
              </div>
              {node.viewCount > 0 && (
                <div className="flex items-center">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {node.viewCount}
                </div>
              )}
            </div>
          </div>

          {/* 难度标签 */}
          <div className="ml-2 flex-shrink-0">
            <span className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${node.difficulty === 'beginner' ? 'bg-green-100 text-green-800' : ''}
              ${node.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${node.difficulty === 'advanced' ? 'bg-red-100 text-red-800' : ''}
            `}>
              {node.difficulty === 'beginner' ? '入门' : 
               node.difficulty === 'intermediate' ? '进阶' : '专业'}
            </span>
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // 渲染搜索栏
  const renderSearchBar = () => (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="搜索知识内容..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
        >
          <Filter className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* 模块选择 */}
      <div className="mt-3">
        <select
          value={currentModule}
          onChange={(e) => setCurrentModule(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {moduleOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // 渲染过滤器
  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-lg z-20">
        <h3 className="font-medium text-gray-900 mb-3">筛选条件</h3>
        
        <div className="space-y-3">
          {/* 难度筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">难度</label>
            <div className="flex space-x-2">
              {['beginner', 'intermediate', 'advanced'].map(difficulty => (
                <button
                  key={difficulty}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  {difficulty === 'beginner' ? '入门' : 
                   difficulty === 'intermediate' ? '进阶' : '专业'}
                </button>
              ))}
            </div>
          </div>

          {/* 可信度筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">可信度</label>
            <div className="flex space-x-2">
              {[7, 8, 9, 10].map(rating => (
                <button
                  key={rating}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  {rating}分以上
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 渲染空状态
  if (initialData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <BookOpen className="w-12 h-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无内容</h3>
        <p className="text-gray-500">该模块暂时没有内容，请稍后再试</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 搜索栏 */}
      {renderSearchBar()}

      {/* 过滤器 */}
      <div className="relative">
        {renderFilters()}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="space-y-2">
          {initialData.map(node => renderNode(node))}
        </div>
      </div>

      {/* 底部操作栏 */}
      {selectedNode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{selectedNode.title}</h3>
              <p className="text-sm text-gray-500">
                {selectedNode.estimatedReadTime || 5}分钟 · {selectedNode.difficulty === 'beginner' ? '入门' : 
                 selectedNode.difficulty === 'intermediate' ? '进阶' : '专业'}
              </p>
            </div>
            <button
              onClick={() => handleNodeSelect(selectedNode)}
              className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              开始学习
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 移动端优化的样式
const mobileStyles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* 触摸优化 */
  .touch-manipulation {
    touch-action: manipulation;
  }
  
  /* 滚动优化 */
  .scroll-smooth {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  
  /* 防止双击缩放 */
  .no-zoom {
    touch-action: manipulation;
    user-select: none;
  }
`;

export default MobileOptimizedKnowledgeTree;
