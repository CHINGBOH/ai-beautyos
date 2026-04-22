import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Admin() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-[#B8A68D]" />
            <h1 className="text-3xl font-bold text-gray-800">系统管理</h1>
          </div>
          <p className="text-gray-600">配置和管理系统设置</p>
        </div>

        <Card className="border-stone-200 shadow-lg">
          <CardHeader>
            <CardTitle>系统设置</CardTitle>
            <CardDescription>
              系统相关配置入口与说明将在此展示，可按需扩展。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              当前无额外集成配置。线索与对话数据保存在本系统数据库中，可在「客户管理」「对话管理」中查看与跟进。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
