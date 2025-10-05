import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster as HotToaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import WebsiteBuilder from "./pages/WebsiteBuilder";
import ChatEditor from "./pages/ChatEditor";
import PreviewPage from "./pages/PreviewPage";
import LivePreview from "./pages/LivePreview";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ProjectCommunity from "./pages/ProjectCommunity";
import Billing from "./pages/Billing";
import ThankYou from "./pages/ThankYou";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HotToaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/community" element={<ProjectCommunity />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:projectId" element={<Editor />} />
            <Route path="/website-builder" element={<WebsiteBuilder />} />
            <Route path="/website-builder/:projectId" element={<WebsiteBuilder />} />
            <Route path="/chat-editor" element={<ChatEditor />} />
            <Route path="/chat-editor/:projectId" element={<ChatEditor />} />
            {/* Preview routes without /p/ prefix - just id/name */}
            <Route path="/:projectId/:projectName" element={<LivePreview />} />
            <Route path="/:projectId" element={<LivePreview />} />
            {/* OLD routes for backwards compatibility */}
            <Route path="/:userId/preview/:slug" element={<PreviewPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
