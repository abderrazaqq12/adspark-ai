import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProjectProvider } from "./contexts/ProjectContext";
import Dashboard from "./pages/Dashboard";
import CreateVideo from "./pages/CreateVideo";
import Projects from "./pages/Projects";
import Gallery from "./pages/Gallery";
import SceneBuilder from "./pages/SceneBuilder";
import Engines from "./pages/Engines";
import Settings from "./pages/Settings";
import Videos from "./pages/Videos";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AITools from "./pages/AITools";
import CreativeReplicator from "./pages/CreativeReplicator";
import CreativeScale from "./pages/CreativeScale";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <ProjectProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/create" element={<CreateVideo />} />
                      <Route path="/quick-generate" element={<CreateVideo />} />
                      <Route path="/creative-replicator" element={<CreativeReplicator />} />
                      <Route path="/creative-scale" element={<CreativeScale />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/gallery" element={<Gallery />} />
                      <Route path="/videos" element={<Videos />} />
                      <Route path="/scene-builder" element={<SceneBuilder />} />
                      <Route path="/engines" element={<Engines />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/ai-tools" element={<AITools />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProjectProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
