import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workers from "./pages/Workers";
import WorkerDetail from "./pages/WorkerDetail";
import Documents from "./pages/Documents";
import DocumentView from "./pages/DocumentView";
import GenerateDocument from "./pages/GenerateDocument";
import Statistics from "./pages/Statistics";
import NotFound from "./pages/NotFound";
import Acomptes from "./pages/Acomptes";
import AcompteView from "./pages/AcompteView";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const queryClient = new QueryClient();

const App = () => (
  <ClerkProvider publishableKey={CLERK_KEY}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SignedIn>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/workers/:id" element={<WorkerDetail />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/:id" element={<DocumentView />} />
                <Route path="/generate/:type" element={<GenerateDocument />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/acomptes" element={<Acomptes />} />
                <Route path="/acomptes/:id" element={<AcompteView />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;
