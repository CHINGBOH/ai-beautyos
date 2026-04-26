import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SmoothScroll } from "./components/SmoothScroll";

// 路由懒加载：首屏只拉当前页 chunk，减少「加载中…」停留时间
const Home = lazy(() => import("./pages/Home"));
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
        color: "#92400e",
        background: "oklch(0.99 0.005 60)",
      }}
    >
      <p>加载中…</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* 落地页路由 */}
      <Route path={"/dashboard/yanmei-ai"} component={YanmeiAI} />
      <Route path={"/"} component={Home} />
      <Route path={"/services"} component={Services} />
      <Route path={"/cases"} component={Cases} />
      <Route path={"/about"} component={About} />
      
      {/* CRM 系统路由 */}
      <Route path={"/chat"} component={Chat} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/dashboard"} component={DashboardOverview} />
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
              <Router />
            </Suspense>
          </SmoothScroll>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
