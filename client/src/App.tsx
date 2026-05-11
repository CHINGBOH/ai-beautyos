import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import DashboardConfig from "./pages/DashboardConfig";
import DashboardAnalytics from "./pages/DashboardAnalytics";
import DashboardConversations from "./pages/DashboardConversations";
import DashboardContent from "./pages/DashboardContent";
import DashboardCustomers from "./pages/DashboardCustomers";
import DashboardKnowledge from "./pages/DashboardKnowledge";
import DashboardKnowledgeTree from "./pages/DashboardKnowledgeTree";
import KnowledgeLibrary from "./pages/KnowledgeLibrary";
import KnowledgeLibraryEmployee from "./pages/KnowledgeLibraryEmployee";
import DashboardXiaohongshu from "./pages/DashboardXiaohongshu";
import DashboardAI from "./pages/DashboardAI";
import DashboardWework from "./pages/DashboardWework";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/chat"} component={Chat} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/dashboard/admin"} component={Admin} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
