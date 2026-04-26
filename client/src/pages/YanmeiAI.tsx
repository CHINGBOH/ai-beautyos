import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function YanmeiAI() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (iframeRef.current) {
        iframeRef.current.style.height = `${window.innerHeight - 120}px`;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-rose-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">妍美 AI 美肤顾问</h1>
          <p className="text-muted-foreground text-sm">
            智能对话、皮肤测试、产品推荐一体化服务
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-rose-100">
        <CardContent className="p-0">
          <iframe
            ref={iframeRef}
            src="/yanmei.html"
            title="妍美AI顾问"
            className="w-full border-0"
            style={{ minHeight: "700px" }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </CardContent>
      </Card>
    </div>
  );
}
