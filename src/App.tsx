import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ChangePassword from "./pages/ChangePassword";
import Partners from "./pages/Partners";
import Projects from "./pages/Projects";
import Sales from "./pages/Sales";
import Documents from "./pages/Documents";
import CalendarPage from "./pages/CalendarPage";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import LicenseGenerator from "./pages/LicenseGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <CompanyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
                <Route path="/partners" element={<MainLayout><Partners /></MainLayout>} />
                <Route path="/projects" element={<MainLayout><Projects /></MainLayout>} />
                <Route path="/sales" element={<MainLayout><Sales /></MainLayout>} />
                <Route path="/documents" element={<MainLayout><Documents /></MainLayout>} />
                <Route path="/calendar" element={<MainLayout><CalendarPage /></MainLayout>} />
                <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
                <Route path="/logs" element={<MainLayout><Logs /></MainLayout>} />
                <Route path="/license-generator" element={<LicenseGenerator />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CompanyProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
