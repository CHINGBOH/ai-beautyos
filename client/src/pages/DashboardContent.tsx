import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatabaseButton } from "@/components/ui/database-button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Copy, Check, Plus, X, Image as ImageIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ContentType = "project" | "case" | "price" | "guide" | "holiday" | "new_product";
type ToneType = "enthusiastic" | "professional" | "casual";

export default function DashboardContent() {
  const [contentType, setContentType] = useState<ContentType>("project");
  const [project, setProject] = useState("超皮秒祛斑");
  const [tone, setTone] = useState<ToneType>("enthusiastic");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [imageStyle, setImageStyle] = useState<"modern" | "elegant" | "vibrant">("modern");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit"); // 编辑/预览模式
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [showQualityPanel, setShowQualityPanel] = useState(false); // 显示质量评估面板
  const [writingTips, setWritingTips] = useState<{tips: string[], generalTips: string[]} | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false); // 显示历史记录面板
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const generateImageMutation = trpc.content.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedImage(data.url || null);
      toast.success("图片生成成功！");
    },
    onError: (error) => {
      toast.error(`图片生成失败：${error.message}`);
    },
  });

  const getHistoryQuery = trpc.contentEnhanced.getHistory.useQuery(
    { postId: selectedPostId || 0, limit: 10 },
    { enabled: !!selectedPostId && showHistoryPanel }
  );

  const getTemplatesQuery = trpc.contentEnhanced.getTemplates.useQuery(
    { type: contentType },
    { enabled: false } // 手动触发
  );
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkItems, setBulkItems] = useState<Array<{
    type: ContentType;
    project: string;
    keywords: string[];
    tone: ToneType;
  }>>([]);
  const [newBulkItem, setNewBulkItem] = useState({
    type: "project" as ContentType,
    project: "超皮秒祛斑",
    keywords: [] as string[],
    tone: "enthusiastic" as ToneType,
  });

  const generateMutation = trpc.content.generate.useMutation({
    onSuccess: (data) => {
      toast.success("内容生成成功！");
      // 生成成功后自动切换到预览模式并填充编辑字段
      setEditedTitle(data.title);
      setEditedContent(data.content);
      setEditedTags(data.tags || []);
      setPreviewMode("preview");
      // 保存postId用于历史记录查询
      if (data.postId) {
        setSelectedPostId(data.postId);
      }
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
    },
  });

  const bulkGenerateMutation = trpc.contentEnhanced.bulkGenerate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowBulkPanel(false); // 成功后关闭批量生成面板
    },
    onError: (error) => {
      toast.error(`批量生成失败：${error.message}`);
    },
  });

  const schedulePostMutation = trpc.contentEnhanced.schedulePost.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`定时发布失败：${error.message}`);
    },
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<Date | null>(null);

  const analyzeQualityMutation = trpc.contentEnhanced.analyzeQuality.useMutation({
    onSuccess: (data) => {
      toast.success("质量分析完成！");
    },
    onError: (error) => {
      toast.error(`质量分析失败：${error.message}`);
    },
  });

  const getWritingTipsQuery = trpc.contentEnhanced.getWritingTips.useQuery(
    { contentType: contentType },
    { enabled: false } // 只在需要时手动触发
  );

  const handleGenerate = () => {
    generateMutation.mutate({
      type: contentType,
      project: project || undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      tone,
    });
  };

  // 保存编辑后的内容
  const handleSaveEdits = () => {
    // 更新生成的内容
    if (generateMutation.data) {
      generateMutation.data.title = editedTitle;
      generateMutation.data.content = editedContent;
      generateMutation.data.tags = editedTags;
      toast.success("修改已保存");
    }
  };

  // 切换预览模式
  const togglePreviewMode = () => {
    if (previewMode === "edit") {
      setPreviewMode("preview");
    } else {
      setPreviewMode("edit");
    }
  };

  // 分析内容质量
  const handleAnalyzeQuality = () => {
    if (editedTitle && editedContent && editedTags) {
      analyzeQualityMutation.mutate({
        title: editedTitle,
        content: editedContent,
        tags: editedTags,
      });
    } else {
      toast.error("请先生成内容再进行质量分析");
    }
  };

  // 获取写作技巧
  const handleGetWritingTips = async () => {
    try {
      const tips = await getWritingTipsQuery.refetch();
      setWritingTips(tips.data || null);
      setShowQualityPanel(true);
    } catch (error) {
      toast.error("获取写作技巧失败");
    }
  };

  // 获取模板
  const handleGetTemplates = async () => {
    try {
      const templates = await getTemplatesQuery.refetch();
      if (templates.data) {
        setShowTemplatesPanel(true);
      }
    } catch (error) {
      toast.error("获取模板失败");
    }
  };

  // 使用模板
  const handleUseTemplate = (template: any) => {
    setEditedTitle(template.title);
    setEditedContent(template.content);
    setEditedTags(template.tags);
    setPreviewMode("preview");
    setSelectedTemplate(template);
    toast.success(`已应用模板: ${template.name}`);
  };

  // 添加批量生成项目
  const handleAddBulkItem = () => {
    setBulkItems([...bulkItems, { ...newBulkItem }]);
    // 重置表单
    setNewBulkItem({
      type: "project" as ContentType,
      project: "超皮秒祛斑",
      keywords: [],
      tone: "enthusiastic" as ToneType,
    });
  };

  // 删除批量生成项目
  const handleRemoveBulkItem = (index: number) => {
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  // 开始批量生成
  const handleBulkGenerate = () => {
    if (bulkItems.length === 0) {
      toast.error("请至少添加一个生成项目");
      return;
    }

    bulkGenerateMutation.mutate({
      items: bulkItems,
      batchSize: 3, // 每批处理3个项目
    });
  };

  // 处理定时发布
  const handleSchedulePost = () => {
    if (!selectedPostId) {
      toast.error("请选择要发布的内容");
      return;
    }
    
    if (!scheduleTime) {
      toast.error("请选择发布时间");
      return;
    }

    schedulePostMutation.mutate({
      postId: selectedPostId,
      scheduledTime: scheduleTime,
    });
    
    setShowScheduleModal(false);
    setScheduleTime(null);
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleCopy = () => {
    if (!generateMutation.data) return;
    const fullText = `${generateMutation.data.title}\n\n${generateMutation.data.content}\n\n${generateMutation.data.tags.join(" ")}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">内容管理</h1>
          <p className="text-muted-foreground mt-2">
            AI智能生成营销内容，提升小红书运营效率
          </p>
        </div>

        {/* 生成器 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI 内容生成器
            </CardTitle>
            <CardDescription>
              自动生成符合小红书风格的医美项目推广文案
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 配置选项 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 内容类型 */}
              <div className="space-y-2">
                <Label>内容类型</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">项目体验分享</SelectItem>
                    <SelectItem value="case">效果对比展示</SelectItem>
                    <SelectItem value="price">价格揭秘</SelectItem>
                    <SelectItem value="guide">避坑指南</SelectItem>
                    <SelectItem value="holiday">节日营销</SelectItem>
                    <SelectItem value="new_product">新品推荐</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 项目选择 */}
              <div className="space-y-2">
                <Label>医美项目</Label>
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="超皮秒祛斑">超皮秒祛斑</SelectItem>
                    <SelectItem value="水光针">水光针</SelectItem>
                    <SelectItem value="热玛吉">热玛吉</SelectItem>
                    <SelectItem value="冷光美白">冷光美白</SelectItem>
                    <SelectItem value="隐形矫正">隐形矫正</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 语气风格 */}
              <div className="space-y-2">
                <Label>语气风格</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as ToneType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enthusiastic">热情洋溢</SelectItem>
                    <SelectItem value="professional">专业严谨</SelectItem>
                    <SelectItem value="casual">轻松随意</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 关键词 */}
              <div className="space-y-2">
                <Label>关键词（可选）</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="输入关键词"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                  />
                  <DatabaseButton
                    type="button"
                    variant="outline"
                    size="icon"
                    pageKey="dashboard-content"
                    buttonKey="add-keyword"
                    fallbackText="+"
                    onClick={handleAddKeyword}
                  >
                    <Plus className="w-4 h-4" />
                  </DatabaseButton>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1">
                        {keyword}
                        <button
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 生成按钮 */}
            <DatabaseButton
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              size="lg"
              pageKey="dashboard-content"
              buttonKey="generate-content"
              fallbackText={generateMutation.isPending ? "生成中..." : "一键生成爽文"}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                </>
              )}
            </DatabaseButton>

            {/* 生成结果 */}
            {generateMutation.data && (
              <div className="space-y-4 pt-4 border-t">
                {/* 预览/编辑切换按钮 */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant={previewMode === "edit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("edit")}
                  >
                    编辑
                  </Button>
                  <Button
                    variant={previewMode === "preview" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("preview")}
                  >
                    预览
                  </Button>
                </div>

                {/* 标题 */}
                <div>
                  <div className="text-sm font-medium mb-2">标题</div>
                  {previewMode === "edit" ? (
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="font-medium"
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{editedTitle}</p>
                    </div>
                  )}
                </div>

                {/* 正文 */}
                <div>
                  <div className="text-sm font-medium mb-2">正文</div>
                  {previewMode === "edit" ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={20}
                      className="font-sans resize-none"
                    />
                  ) : (
                    <Textarea
                      value={editedContent}
                      readOnly
                      rows={20}
                      className="font-sans resize-none bg-muted"
                    />
                  )}
                </div>

                {/* 标签编辑 */}
                <div>
                  <div className="text-sm font-medium mb-2">话题标签</div>
                  {previewMode === "edit" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="添加新标签"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && keywordInput.trim()) {
                              e.preventDefault();
                              if (!editedTags.includes(keywordInput.trim())) {
                                setEditedTags([...editedTags, keywordInput.trim()]);
                                setKeywordInput("");
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (keywordInput.trim() && !editedTags.includes(keywordInput.trim())) {
                              setEditedTags([...editedTags, keywordInput.trim()]);
                              setKeywordInput("");
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editedTags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              onClick={() => setEditedTags(editedTags.filter((_, i) => i !== index))}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {editedTags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* 图片生成 */}
                <div>
                  <div className="text-sm font-medium mb-2">配图</div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Select value={imageStyle} onValueChange={(v) => setImageStyle(v as any)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">现代简约</SelectItem>
                          <SelectItem value="elegant">优雅高级</SelectItem>
                          <SelectItem value="vibrant">活力鲜艳</SelectItem>
                        </SelectContent>
                      </Select>
                      <DatabaseButton
                        onClick={() => {
                          generateImageMutation.mutate({
                            title: editedTitle,
                            content: editedContent,
                            project: project || undefined,
                            style: imageStyle,
                          });
                        }}
                        disabled={generateImageMutation.isPending}
                        variant="outline"
                        pageKey="dashboard-content"
                        buttonKey="generate-image"
                        fallbackText={generateImageMutation.isPending ? "生成中..." : "生成配图"}
                      >
                        {generateImageMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 mr-2" />
                          </>
                        )}
                      </DatabaseButton>
                    </div>
                    {generatedImage && (
                      <div className="relative rounded-lg overflow-hidden border">
                        <img
                          src={generatedImage}
                          alt="Generated image"
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-4">
                  {previewMode === "edit" && (
                    <DatabaseButton
                      onClick={handleSaveEdits}
                      variant="outline"
                      className="flex-1"
                      pageKey="dashboard-content"
                      buttonKey="save-edits"
                      fallbackText="保存修改"
                    >
                      <Check className="w-4 h-4 mr-2" />
                    </DatabaseButton>
                  )}
                  <DatabaseButton
                    onClick={handleCopy}
                    variant="outline"
                    className="flex-1"
                    pageKey="dashboard-content"
                    buttonKey="copy-all"
                    fallbackText={copied ? "已复制" : "复制全部"}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                      </>
                    )}
                  </DatabaseButton>
                  <DatabaseButton
                    onClick={handleGenerate}
                    variant="outline"
                    className="flex-1"
                    pageKey="dashboard-content"
                    buttonKey="regenerate"
                    fallbackText="重新生成"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </DatabaseButton>
                  <DatabaseButton
                    onClick={() => setShowScheduleModal(true)}
                    variant="outline"
                    className="flex-1"
                    pageKey="dashboard-content"
                    buttonKey="schedule-post"
                    fallbackText="定时发布"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </DatabaseButton>
                </div>

                {/* 质量评估和写作技巧按钮 */}
                <div className="flex gap-2 pt-2">
                  <DatabaseButton
                    onClick={handleAnalyzeQuality}
                    variant="outline"
                    size="sm"
                    pageKey="dashboard-content"
                    buttonKey="analyze-quality"
                    fallbackText="内容质量分析"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </DatabaseButton>
                  <DatabaseButton
                    onClick={handleGetWritingTips}
                    variant="outline"
                    size="sm"
                    pageKey="dashboard-content"
                    buttonKey="writing-tips"
                    fallbackText="写作技巧"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </DatabaseButton>
                  <DatabaseButton
                    onClick={handleGetTemplates}
                    variant="outline"
                    size="sm"
                    pageKey="dashboard-content"
                    buttonKey="templates"
                    fallbackText="模板库"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </DatabaseButton>
                  <DatabaseButton
                    onClick={() => setShowBulkPanel(true)}
                    variant="outline"
                    size="sm"
                    pageKey="dashboard-content"
                    buttonKey="bulk-generate"
                    fallbackText="批量生成"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                  </DatabaseButton>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQualityPanel(!showQualityPanel)}
                  >
                    {showQualityPanel ? "隐藏" : "显示"} 技巧/分析
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                  >
                    {showHistoryPanel ? "隐藏" : "显示"} 历史记录
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplatesPanel(!showTemplatesPanel)}
                  >
                    {showTemplatesPanel ? "隐藏" : "显示"} 模板
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkPanel(!showBulkPanel)}
                  >
                    {showBulkPanel ? "隐藏" : "显示"} 批量生成
                  </Button>
                </div>

                {/* 质量评估和写作技巧面板 */}
                {showQualityPanel && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">写作技巧与质量分析</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {writingTips && (
                          <div>
                            <h4 className="font-medium mb-2">针对{contentType}类型的写作技巧：</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {writingTips.tips.map((tip, index) => (
                                <li key={index}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {analyzeQualityMutation.data && (
                          <div>
                            <h4 className="font-medium mb-2">内容质量分析：</h4>
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium">评分:</span> 
                                <span className="ml-2">{analyzeQualityMutation.data.validation.score}/100</span>
                              </div>
                              {analyzeQualityMutation.data.validation.errors.length > 0 && (
                                <div>
                                  <span className="font-medium">错误:</span>
                                  <ul className="list-disc pl-5 mt-1">
                                    {analyzeQualityMutation.data.validation.errors.map((error, index) => (
                                      <li key={index} className="text-red-600">{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {analyzeQualityMutation.data.validation.warnings.length > 0 && (
                                <div>
                                  <span className="font-medium">警告:</span>
                                  <ul className="list-disc pl-5 mt-1">
                                    {analyzeQualityMutation.data.validation.warnings.map((warning, index) => (
                                      <li key={index} className="text-yellow-600">{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {analyzeQualityMutation.data.suggestions.length > 0 && (
                                <div>
                                  <span className="font-medium">改进建议:</span>
                                  <ul className="list-disc pl-5 mt-1">
                                    {analyzeQualityMutation.data.suggestions.map((suggestion, index) => (
                                      <li key={index}>{suggestion}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {!writingTips && !analyzeQualityMutation.data && (
                          <p className="text-muted-foreground">点击上方按钮获取写作技巧或进行内容质量分析</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 历史记录面板 */}
                {showHistoryPanel && selectedPostId && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">内容历史记录</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getHistoryQuery.isLoading ? (
                        <div className="flex justify-center items-center h-20">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="ml-2">加载历史记录中...</span>
                        </div>
                      ) : getHistoryQuery.data && getHistoryQuery.data.length > 0 ? (
                        <div className="space-y-4">
                          <h4 className="font-medium">版本历史 (最近10个版本):</h4>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {getHistoryQuery.data.map((history, index) => (
                              <div key={history.id} className="border rounded-lg p-3 bg-background">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium">{history.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                      版本 {history.version} • {new Date(history.createdAt).toLocaleString('zh-CN')}
                                    </div>
                                    <div className="text-sm mt-1 line-clamp-2">{history.content.substring(0, 100)}...</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      质量分: {history.qualityScore}
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="mt-2 text-xs"
                                      onClick={() => {
                                        setEditedTitle(history.title);
                                        setEditedContent(history.content);
                                        setEditedTags(history.tags || []);
                                        setPreviewMode("preview");
                                        toast.success("已加载历史版本");
                                      }}
                                    >
                                      加载此版本
                                    </Button>
                                  </div>
                                </div>
                                
                                {history.validationErrors && history.validationErrors.length > 0 && (
                                  <div className="mt-2 text-xs text-red-600">
                                    错误: {history.validationErrors.join(', ')}
                                  </div>
                                )}
                                
                                {history.validationWarnings && history.validationWarnings.length > 0 && (
                                  <div className="mt-1 text-xs text-yellow-600">
                                    警告: {history.validationWarnings.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">暂无历史记录</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 模板面板 */}
                {showTemplatesPanel && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">内容模板</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getTemplatesQuery.isLoading ? (
                        <div className="flex justify-center items-center h-20">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="ml-2">加载模板中...</span>
                        </div>
                      ) : getTemplatesQuery.data && getTemplatesQuery.data.templates.length > 0 ? (
                        <div className="space-y-4">
                          <h4 className="font-medium">预设模板 (适用于 {contentType} 类型):</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {getTemplatesQuery.data.templates.map((template) => (
                              <Card 
                                key={template.id} 
                                className={`cursor-pointer hover:shadow-md transition-shadow ${
                                  selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                                }`}
                                onClick={() => handleUseTemplate(template)}
                              >
                                <CardContent className="p-4">
                                  <h5 className="font-medium mb-2">{template.name}</h5>
                                  <p className="text-sm line-clamp-2 mb-2">{template.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-3">{template.content.substring(0, 100)}...</p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {template.tags.slice(0, 3).map((tag, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">暂无可用模板</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 批量生成面板 */}
                {showBulkPanel && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">批量生成内容</CardTitle>
                      <CardDescription>一次性生成多个不同类型的内容</CardDescription>
                    </CardHeader>
                    <CardContent>
                {/* 定时发布模态框 */}
                {showScheduleModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[480px] p-6">
                      <CardHeader>
                        <CardTitle>定时发布</CardTitle>
                        <CardDescription>选择发布时间</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>发布时间</Label>
                            <Input
                              type="datetime-local"
                              value={scheduleTime ? new Date(scheduleTime.getTime() - scheduleTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                              onChange={(e) => setScheduleTime(new Date(e.target.value))}
                              min={new Date().toISOString().slice(0, 16)}
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowScheduleModal(false);
                                setScheduleTime(null);
                              }}
                            >
                              取消
                            </Button>
                            <Button
                              onClick={handleSchedulePost}
                              disabled={!scheduleTime || schedulePostMutation.isPending}
                            >
                              {schedulePostMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  发布中...
                                </>
                              ) : (
                                "确认发布"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* 批量生成面板 */}
                {showBulkPanel && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">批量生成内容</CardTitle>
                      <CardDescription>一次性生成多个不同类型的内容</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* 添加新项目表单 */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">添加生成项目</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <Label>内容类型</Label>
                                <Select 
                                  value={newBulkItem.type} 
                                  onValueChange={(value) => setNewBulkItem({...newBulkItem, type: value as ContentType})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="project">项目体验分享</SelectItem>
                                    <SelectItem value="case">效果对比展示</SelectItem>
                                    <SelectItem value="price">价格揭秘</SelectItem>
                                    <SelectItem value="guide">避坑指南</SelectItem>
                                    <SelectItem value="holiday">节日营销</SelectItem>
                                    <SelectItem value="new_product">新品推荐</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label>医美项目</Label>
                                <Input
                                  value={newBulkItem.project}
                                  onChange={(e) => setNewBulkItem({...newBulkItem, project: e.target.value})}
                                  placeholder="输入项目名称"
                                />
                              </div>
                              
                              <div>
                                <Label>语气风格</Label>
                                <Select 
                                  value={newBulkItem.tone} 
                                  onValueChange={(value) => setNewBulkItem({...newBulkItem, tone: value as ToneType})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="enthusiastic">热情洋溢</SelectItem>
                                    <SelectItem value="professional">专业严谨</SelectItem>
                                    <SelectItem value="casual">轻松随意</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex items-end">
                                <Button 
                                  type="button" 
                                  onClick={handleAddBulkItem}
                                  className="w-full"
                                >
                                  添加到队列
                                </Button>
                              </div>
                            </div>
                            
                            {/* 关键词输入 */}
                            <div className="mt-4">
                              <Label>关键词（可选）</Label>
                              <div className="flex gap-2 mt-2">
                                <Input
                                  placeholder="输入关键词，回车添加"
                                  value={newBulkItem.keywords.join(',')}
                                  onChange={(e) => setNewBulkItem({
                                    ...newBulkItem, 
                                    keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                                  })}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* 批量项目列表 */}
                        <div>
                          <h4 className="font-medium mb-2">待生成列表 ({bulkItems.length} 个项目)</h4>
                          {bulkItems.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {bulkItems.map((item, index) => (
                                <Card key={index} className="p-3">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium">{item.type}</span>
                                      <span className="mx-2">•</span>
                                      <span>{item.project}</span>
                                      <span className="mx-2">•</span>
                                      <span className="text-sm text-muted-foreground">{item.tone}</span>
                                      {item.keywords.length > 0 && (
                                        <>
                                          <span className="mx-2">•</span>
                                          <span className="text-sm text-muted-foreground">关键词: {item.keywords.join(', ')}</span>
                                        </>
                                      )}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemoveBulkItem(index)}
                                    >
                                      删除
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">暂无待生成项目</p>
                          )}
                        </div>

                        {/* 批量生成按钮 */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowBulkPanel(false)}
                          >
                            取消
                          </Button>
                          <Button
                            onClick={handleBulkGenerate}
                            disabled={bulkItems.length === 0 || bulkGenerateMutation.isPending}
                          >
                            {bulkGenerateMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                批量生成 ({bulkItems.length} 个)
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ol className="space-y-2">
              <li>选择内容类型：项目体验分享、效果对比、价格揭秘、避坑指南、节日营销</li>
              <li>选择要推广的医美项目：超皮秒祛斑、水光针、热玛吉、冷光美白、隐形矫正</li>
              <li>选择语气风格：热情洋溢、专业严谨、轻松随意</li>
              <li>（可选）添加必须包含的关键词，让内容更贴合需求</li>
              <li>点击"一键生成爽文"，AI 会基于知识库内容自动生成小红书风格文案</li>
              <li>生成后可以点击"复制全部"一键复制到剪贴板，然后粘贴到小红书发布</li>
              <li>如果对生成的内容不满意，可以点击"重新生成"获取新的文案</li>
              <li>建议配合真实的术前术后对比照片，效果更佳</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
