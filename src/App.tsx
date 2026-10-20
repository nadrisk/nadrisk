import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import VjPage from "./pages/VjPage.tsx";
import NativeGroovebox from "./pages/NativeGroovebox.tsx";

const queryClient = new QueryClient();
const nativePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has("native");
const nativeApp = Capacitor.isNativePlatform() || nativePreview;

const vjWindow = new URLSearchParams(window.location.search).has("vj");

const App = () => vjWindow ? <VjPage /> : (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {nativeApp ? <NativeGroovebox /> : (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
