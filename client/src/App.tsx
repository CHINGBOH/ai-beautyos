import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SmoothScroll } from "./components/SmoothScroll";
import Home from "./pages/Home";

// 当部署在子路径下（例如 https://example.com/beauty/）时，Vite 在构建时
// 注入 import.meta.env.BASE_URL（带尾斜杠）。wouter 的 Router base 不接受
// 尾斜杠，去掉后传入。
const RAW_BASE = import.meta.env.BASE_URL || "/";
const ROUTER_BASE = RAW_BASE === "/" ? "" : RAW_BASE.replace(/\/$/, "");

// 首页是 /beauty/ 首屏，直接打进入口包，避免线上长时间停在品牌加载态。
const Services = lazy(() => import("./pages/Services"));
const Cases = lazy(() => import("./pages/Cases"));
const About = lazy(() => import("./pages/About"));
const Chat = lazy(() => import("./pages/Chat"));
const Admin = lazy(() => import("./pages/Admin"));
const Analytics = lazy(() => import("./pages/Analytics"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));
const DashboardConfig = lazy(() => import("./pages/DashboardConfig"));
const DashboardAnalytics = lazy(() => import("./pages/DashboardAnalytics"));
const DashboardConversations = lazy(() => import("./pages/DashboardConversations"));
const DashboardContent = lazy(() => import("./pages/DashboardContent"));
const DashboardCustomers = lazy(() => import("./pages/DashboardCustomers"));
const DashboardKnowledge = lazy(() => import("./pages/DashboardKnowledge"));
const DashboardKnowledgeTree = lazy(() => import("./pages/DashboardKnowledgeTree"));
const KnowledgeLibrary = lazy(() => import("./pages/KnowledgeLibrary"));
const KnowledgeLibraryEmployee = lazy(() => import("./pages/KnowledgeLibraryEmployee"));
const DashboardXiaohongshu = lazy(() => import("./pages/DashboardXiaohongshu"));
const DashboardAI = lazy(() => import("./pages/DashboardAI"));
const DashboardWework = lazy(() => import("./pages/DashboardWework"));
const DashboardTriggers = lazy(() => import("./pages/DashboardTriggers"));
const DashboardBoss = lazy(() => import("./pages/DashboardBoss"));
const DashboardMarketing = lazy(() => import("./pages/DashboardMarketing"));
const YanmeiAI = lazy(() => import("./pages/YanmeiAI"));
const NotFound = lazy(() => import("./pages/NotFound"));

/** 与 index.html 占位一致的加载态，避免样式闪烁 */
function LoadingFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        color: "#6f5847",
        background: "#fbf8f3",
      }}
    >
      <p style={{ letterSpacing: "0.18em" }}>LUMIÈRE</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* CRM 系统路由 */}
      <Route path={"/dashboard/yanmei-ai"} component={YanmeiAI} />
      <Route path={"/chat"} component={Chat} />
      <Route path={"/dashboard/chat"} component={Chat} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/dashboard/overview"} component={DashboardOverview} />
      <Route path={"/dashboard/admin"} component={Admin} />
      <Route path={"/dashboard/boss"} component={DashboardBoss} />
      <Route path={"/dashboard/marketing"} component={DashboardMarketing} />
      <Route path={"/dashboard/config"} component={DashboardConfig} />
      <Route path={"/dashboard/analytics"} component={DashboardAnalytics} />
      <Route path={"/dashboard/conversations"} component={DashboardConversations} />
      <Route path={"/dashboard/content"} component={DashboardContent} />
      <Route path={"/dashboard/customers"} component={DashboardCustomers} />
      <Route path={"/dashboard/knowledge"} component={DashboardKnowledge} />
      <Route path={"/dashboard/knowledge-tree"} component={DashboardKnowledgeTree} />
      <Route path={"/knowledge"} component={KnowledgeLibrary} />
      <Route path={"/knowledge/employee"} component={KnowledgeLibraryEmployee} />
      <Route path={"/dashboard/xiaohongshu"} component={DashboardXiaohongshu} />
      <Route path={"/dashboard/ai"} component={DashboardAI} />
      <Route path={"/dashboard/wework"} component={DashboardWework} />
      <Route path={"/dashboard/triggers"} component={DashboardTriggers} />
      <Route path={"/dashboard"} component={DashboardOverview} />

      {/* 落地页路由 */}
      <Route path={"/services"} component={Services} />
      <Route path={"/cases"} component={Cases} />
      <Route path={"/about"} component={About} />
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <SmoothScroll>
            <Suspense fallback={<LoadingFallback />}>
              <WouterRouter base={ROUTER_BASE}>
                <Router />
              </WouterRouter>
            </Suspense>
          </SmoothScroll>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
