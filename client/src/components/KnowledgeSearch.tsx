import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Mic, Image as ImageIcon, Sparkles } from "lucide-react";
import { KNOWLEDGE_MODULES, MODULE_NAMES } from "@shared/types";

interface KnowledgeSearchProps {
  onSelectKnowledge?: (knowledgeId: number) => void;
  module?: string;
}

export function KnowledgeSearch({ onSelectKnowledge, module }: KnowledgeSearchProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "symptom" | "image">("keyword");

  // 关键词搜索
  const { data: keywordResults, isLoading: keywordLoading } = trpc.knowledge.search.useQuery(
    {
      keyword: searchKeyword,
      module,
      limit: 10,
    },
    {
      enabled: searchKeyword.length > 0 && searchMode === "keyword",
    }
  );

  // 症状搜索（可以扩展为专门的症状匹配API）
  const { data: symptomResults, isLoading: symptomLoading } = trpc.knowledge.search.useQuery(
    {
      keyword: searchKeyword,
      module,
      limit: 10,
    },
    {
      enabled: searchKeyword.length > 0 && searchMode === "symptom",
    }
  );

  const isLoading = keywordLoading || symptomLoading;
  const results = searchMode === "symptom" ? symptomResults : keywordResults;

  // 常见症状快捷按钮
  const commonSymptoms = [
    "色斑", "痘痘", "敏感", "老化", "干燥", "油腻", "暗沉", "毛孔粗大",
    "黑眼圈", "眼袋", "法令纹", "双下巴", "皮肤松弛"
  ];

  return (
    <div className="space-y-4">
      {/* 搜索模式切换 */}
      <div className="flex gap-2">
        <Button
          variant={searchMode === "keyword" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("keyword")}
        >
          <Search className="w-4 h-4 mr-2" />
          关键词搜索
        </Button>
        <Button
          variant={searchMode === "symptom" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("symptom")}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          症状搜索
        </Button>
        <Button
          variant={searchMode === "image" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("image")}
          disabled
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          图片搜索
          <Badge variant="secondary" className="ml-2 text-xs">即将推出</Badge>
        </Button>
      </div>

      {/* 搜索输入 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={
            searchMode === "symptom"
              ? "描述您的皮肤问题，如：脸上有斑点、经常长痘痘..."
              : "搜索知识库内容..."
          }
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 症状搜索快捷按钮 */}
      {searchMode === "symptom" && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">常见症状：</p>
          <div className="flex flex-wrap gap-2">
            {commonSymptoms.map((symptom) => (
              <Button
                key={symptom}
                variant="outline"
                size="sm"
                onClick={() => setSearchKeyword(symptom)}
              >
                {symptom}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {searchKeyword && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">搜索中...</div>
          ) : results && results.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                找到 {results.length} 个相关结果
              </div>
              {results.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onSelectKnowledge?.(item.id)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-1">{item.title}</h3>
                        {item.summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.summary}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {item.module && (
                            <Badge variant="secondary" className="text-xs">
                              {MODULE_NAMES[item.module as keyof typeof MODULE_NAMES] || item.module}
                            </Badge>
                          )}
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            查看 {item.viewCount}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              未找到相关结果，请尝试其他关键词
            </div>
          )}
        </div>
      )}
    </div>
  );
}
