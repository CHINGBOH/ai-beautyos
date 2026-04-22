/**
 * 共享API类型定义
 * 前后端共用，确保类型一致性
 */

// ==================== Chat Types ====================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  type?: "text" | "service-card" | "appointment-form" | "loading";
  metadata?: {
    services?: unknown[];
    serviceId?: string;
  };
}

export interface ChatHistoryItem {
  role: string;
  content: string;
}

export interface ExtractedCustomerInfo {
  name?: string;
  phone?: string;
  wechat?: string;
  interestedServices?: string[];
  budget?: string;
}

export interface SendMessageInput {
  sessionId: string;
  message: string;
}

export interface SendMessageOutput {
  response: string;
  extractedInfo: ExtractedCustomerInfo | null;
}

export interface CreateSessionOutput {
  sessionId: string;
}

export interface ConvertToLeadInput {
  sessionId: string;
  name: string;
  phone: string;
  wechat?: string;
  interestedServices?: string[];
  budget?: string;
  message?: string;
  source?: string;
}

export interface ConvertToLeadOutput {
  success: boolean;
  leadId: string;
  airtableSynced: boolean;
  error?: string;
}

// ==================== Customer Types ====================

export interface Customer {
  id: number;
  name: string;
  phone: string;
  wechat?: string | null;
  age?: number | null;
  hood?: string | null;
  birthday?: string | null;
  importantHolidays?: string | null;
  interestedServices?: string | null;
  budget?: string | null;
  budgetLevel?: string | null;
  status: string;
  source: string;
  customerTier?: string | null;
  psychologyType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerStats {
  total: number;
  tierA: number;
  tierB: number;
  tierC: number;
  tierD: number;
  恐惧型: number;
  贪婪型: number;
  安全型: number;
  敏感型: number;
}

export interface Lead {
  id: number;
  airtableId?: string | null;
  name: string;
  phone: string;
  wechat?: string | null;
  age?: number | null;
  hood?: string | null;
  birthday?: string | null;
  importantHolidays?: string | null;
  interestedServices?: string | null;
  budget?: string | null;
  budgetLevel?: string | null;
  message?: string | null;
  source: string;
  sourceContent?: string | null;
  status: string;
  psychologyType?: string | null;
  psychologyTags?: string | null;
  customerTier?: string | null;
  notes?: string | null;
  followUpDate?: string | null;
  syncedAt?: string | null;
  convertedAt?: string | null;
  convertedToCustomerId?: number | null;
  conversationId?: number | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== Knowledge Types ====================

export interface KnowledgeItem {
  id: number;
  type: "customer" | "internal";
  title: string;
  content: string;
  category: string;
  tags?: string | null;
  module?: string;
  usedCount: number;
  viewCount: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeTreeNode {
  id: number;
  title: string;
  level: number;
  order: number;
  children?: KnowledgeTreeNode[];
}

// ==================== Analytics Types ====================

export interface OverviewStats {
  totalLeads: number;
  totalConversations: number;
  sourceDistribution: Record<string, number>;
  projectDistribution: Record<string, number>;
  recentLeads: Customer[];
}

export interface LeadsReportOutput {
  success: boolean;
  report?: string;
  leadsCount?: number;
  error?: string;
}

export interface MarketingSuggestionsOutput {
  success: boolean;
  suggestions?: string;
  performanceData?: {
    totalLeads: number;
    sourceDistribution: Record<string, number>;
    projectDistribution: Record<string, number>;
    budgetDistribution: Record<string, number>;
  };
  error?: string;
}

// ==================== Trigger Types ====================

export interface Trigger {
  id: number;
  name: string;
  type: string;
  status: "active" | "inactive";
  condition: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerExecution {
  id: number;
  triggerId: number;
  executedAt: string;
  status: "success" | "failed";
  result: string;
}

// ==================== Content Types ====================

export interface ContentGenerationInput {
  type: "project" | "case" | "price" | "guide" | "holiday" | "new_product";
  project?: string;
  keywords?: string[];
  tone?: "enthusiastic" | "professional" | "casual";
  useCache?: boolean;
}

export interface ContentGenerationOutput {
  title: string;
  content: string;
  tags: string[];
  type: string;
}

export interface ContentTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  tags: string[];
}

// ==================== API Response Types ====================

export interface ApiError {
  code: string;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
