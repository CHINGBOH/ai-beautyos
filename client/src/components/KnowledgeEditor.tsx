import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Image as ImageIcon, Video, Music, FileText } from "lucide-react";
import { KNOWLEDGE_MODULES, MODULE_NAMES, DIFFICULTY_LEVELS, DIFFICULTY_NAMES } from "@shared/types";

interface KnowledgeEditorProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function KnowledgeEditor({ initialData, onSubmit, onCancel }: KnowledgeEditorProps) {
  const [formData, setFormData] = useState({
    // 层级结构
    parentId: initialData?.parentId || null,
    level: initialData?.level || 1,
    path: initialData?.path || "",
    order: initialData?.order || 0,
    
    // 模块和分类
    module: initialData?.module || KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    category: initialData?.category || "",
    subCategory: initialData?.subCategory || "",
    
    // 内容
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    content: initialData?.content || "",
    
    // 多维度内容
    positiveEvidence: initialData?.positiveEvidence ? JSON.stringify(JSON.parse(initialData.positiveEvidence), null, 2) : "",
    negativeEvidence: initialData?.negativeEvidence ? JSON.stringify(JSON.parse(initialData.negativeEvidence), null, 2) : "",
    neutralAnalysis: initialData?.neutralAnalysis || "",
    practicalGuide: initialData?.practicalGuide ? JSON.stringify(JSON.parse(initialData.practicalGuide), null, 2) : "",
    caseStudies: initialData?.caseStudies ? JSON.stringify(JSON.parse(initialData.caseStudies), null, 2) : "",
    expertOpinions: initialData?.expertOpinions ? JSON.stringify(JSON.parse(initialData.expertOpinions), null, 2) : "",
    
    // 多媒体
    images: initialData?.images ? JSON.parse(initialData.images) : [],
    videos: initialData?.videos ? JSON.parse(initialData.videos) : [],
    audio: initialData?.audio ? JSON.parse(initialData.audio) : [],
    
    // 元数据
    tags: initialData?.tags ? JSON.parse(initialData.tags || "[]") : [],
    sources: initialData?.sources ? JSON.stringify(JSON.parse(initialData.sources), null, 2) : "",
    credibility: initialData?.credibility || 5,
    difficulty: initialData?.difficulty || DIFFICULTY_LEVELS.BEGINNER,
    
    // 状态
    type: initialData?.type || "customer",
    isActive: initialData?.isActive ?? 1,
  });

  const [newTag, setNewTag] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newAudioUrl, setNewAudioUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证JSON格式
    const jsonFields = ['positiveEvidence', 'negativeEvidence', 'practicalGuide', 'caseStudies', 'expertOpinions', 'sources'];
    const processedData: any = { ...formData };
    
    for (const field of jsonFields) {
      if (processedData[field] && processedData[field].trim()) {
        try {
          processedData[field] = JSON.stringify(JSON.parse(processedData[field]));
        } catch (error) {
          alert(`${field} 不是有效的JSON格式`);
          return;
        }
      } else {
        processedData[field] = null;
      }
    }
    
    // 处理数组字段
    processedData.tags = JSON.stringify(formData.tags);
    processedData.images = JSON.stringify(formData.images);
    processedData.videos = JSON.stringify(formData.videos);
    processedData.audio = JSON.stringify(formData.audio);
    
    onSubmit(processedData);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const addMedia = (type: "images" | "videos" | "audio", url: string) => {
    if (url.trim()) {
      setFormData({
        ...formData,
        [type]: [...formData[type], { url: url.trim(), title: "" }],
      });
      if (type === "images") setNewImageUrl("");
      if (type === "videos") setNewVideoUrl("");
      if (type === "audio") setNewAudioUrl("");
    }
  };

  const removeMedia = (type: "images" | "videos" | "audio", index: number) => {
    setFormData({
      ...formData,
      [type]: formData[type].filter((_: any, i: number) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>模块 *</Label>
          <Select
            value={formData.module}
            onValueChange={(value) => setFormData({ ...formData, module: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MODULE_NAMES).map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>层级 *</Label>
          <Select
            value={String(formData.level)}
            onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <SelectItem key={level} value={String(level)}>
                  第 {level} 层
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>分类</Label>
          <Input
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="二级分类"
          />
        </div>

        <div>
          <Label>子分类</Label>
          <Input
            value={formData.subCategory}
            onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
            placeholder="三级分类"
          />
        </div>

        <div>
          <Label>难度</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIFFICULTY_NAMES).map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>可信度 (1-10)</Label>
          <Input
            type="number"
            min="1"
            max="10"
            value={formData.credibility}
            onChange={(e) => setFormData({ ...formData, credibility: parseInt(e.target.value) || 5 })}
          />
        </div>
      </div>

      {/* 标题和摘要 */}
      <div>
        <Label>标题 *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="知识库标题"
          required
        />
      </div>

      <div>
        <Label>摘要</Label>
        <Textarea
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          placeholder="简短摘要，用于预览"
          rows={2}
        />
      </div>

      {/* 完整内容 */}
      <div>
        <Label>完整内容 *</Label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="知识库完整内容"
          rows={10}
          required
        />
      </div>

      {/* 多媒体内容 */}
      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            图片
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="图片URL"
            />
            <Button type="button" onClick={() => addMedia("images", newImageUrl)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {formData.images.map((img: any, index: number) => (
              <div key={index} className="relative border rounded p-2">
                <img src={img.url} alt={img.title || `Image ${index + 1}`} className="w-full h-24 object-cover rounded" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1"
                  onClick={() => removeMedia("images", index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            视频
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="视频URL"
            />
            <Button type="button" onClick={() => addMedia("videos", newVideoUrl)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {formData.videos.map((video: any, index: number) => (
              <div key={index} className="flex items-center gap-2 border rounded p-2">
                <Video className="w-4 h-4" />
                <span className="flex-1 text-sm truncate">{video.url}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMedia("videos", index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            音频
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newAudioUrl}
              onChange={(e) => setNewAudioUrl(e.target.value)}
              placeholder="音频URL"
            />
            <Button type="button" onClick={() => addMedia("audio", newAudioUrl)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {formData.audio.map((audio: any, index: number) => (
              <div key={index} className="flex items-center gap-2 border rounded p-2">
                <Music className="w-4 h-4" />
                <span className="flex-1 text-sm truncate">{audio.url}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMedia("audio", index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 多维度内容 */}
      <div className="space-y-4">
        <div>
          <Label>正面论证 (JSON格式)</Label>
          <Textarea
            value={formData.positiveEvidence}
            onChange={(e) => setFormData({ ...formData, positiveEvidence: e.target.value })}
            placeholder='[{"source": "来源", "content": "内容", "data": "数据"}]'
            rows={4}
          />
        </div>

        <div>
          <Label>反面论证 (JSON格式)</Label>
          <Textarea
            value={formData.negativeEvidence}
            onChange={(e) => setFormData({ ...formData, negativeEvidence: e.target.value })}
            placeholder='[{"source": "来源", "content": "内容", "data": "数据"}]'
            rows={4}
          />
        </div>

        <div>
          <Label>中立分析</Label>
          <Textarea
            value={formData.neutralAnalysis}
            onChange={(e) => setFormData({ ...formData, neutralAnalysis: e.target.value })}
            placeholder="客观评价、适用条件、注意事项"
            rows={4}
          />
        </div>

        <div>
          <Label>实践指导 (JSON格式)</Label>
          <Textarea
            value={formData.practicalGuide}
            onChange={(e) => setFormData({ ...formData, practicalGuide: e.target.value })}
            placeholder='[{"step": 1, "description": "步骤描述", "tools": "所需工具"}]'
            rows={4}
          />
        </div>

        <div>
          <Label>案例研究 (JSON格式)</Label>
          <Textarea
            value={formData.caseStudies}
            onChange={(e) => setFormData({ ...formData, caseStudies: e.target.value })}
            placeholder='[{"title": "案例标题", "description": "描述", "before": "之前", "after": "之后", "duration": "持续时间"}]'
            rows={4}
          />
        </div>

        <div>
          <Label>专家观点 (JSON格式)</Label>
          <Textarea
            value={formData.expertOpinions}
            onChange={(e) => setFormData({ ...formData, expertOpinions: e.target.value })}
            placeholder='[{"expert": "专家姓名", "title": "专家头衔", "content": "观点内容", "source": "来源"}]'
            rows={4}
          />
        </div>
      </div>

      {/* 标签 */}
      <div>
        <Label>标签</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="输入标签后按Enter"
          />
          <Button type="button" onClick={addTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* 来源 */}
      <div>
        <Label>来源 (JSON格式)</Label>
        <Textarea
          value={formData.sources}
          onChange={(e) => setFormData({ ...formData, sources: e.target.value })}
          placeholder='[{"type": "期刊/网站/书籍", "title": "标题", "url": "URL", "author": "作者", "date": "日期"}]'
          rows={4}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">保存</Button>
      </div>
    </form>
  );
}
