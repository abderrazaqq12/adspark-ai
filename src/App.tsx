import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import CreateVideo from "./pages/CreateVideo";
import Projects from "./pages/Projects";
import SceneBuilder from "./pages/SceneBuilder";
import Engines from "./pages/Engines";
import Settings from "./pages/Settings";
import Videos from "./pages/Videos";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import ABTesting from "./pages/ABTesting";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import QuickGenerate from "./pages/QuickGenerate";
import Studio from "./pages/Studio";
import QuickCommerce from "./pages/QuickCommerce";
import AgencyMode from "./pages/AgencyMode";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/create" element={<CreateVideo />} />
                  <Route path="/quick-generate" element={<QuickGenerate />} />
                  <Route path="/quick-commerce" element={<QuickCommerce />} />
                  <Route path="/agency" element={<AgencyMode />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/videos" element={<Videos />} />
                  <Route path="/scene-builder" element={<SceneBuilder />} />
                  <Route path="/engines" element={<Engines />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/ab-testing" element={<ABTesting />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
