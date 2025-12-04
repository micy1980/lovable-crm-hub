import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { useDeadlineChecker } from "@/hooks/useDeadlineChecker";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load all pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Register = lazy(() => import("./pages/Register"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Partners = lazy(() => import("./pages/Partners"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const SalesDetail = lazy(() => import("./pages/SalesDetail"));
const Sales = lazy(() => import("./pages/Sales"));
const Documents = lazy(() => import("./pages/Documents"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Logs = lazy(() => import("./pages/Logs"));
const LicenseGenerator = lazy(() => import("./pages/LicenseGenerator"));
const AccountManagement = lazy(() => import("./pages/AccountManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px] p-8">
    <div className="space-y-4 w-full max-w-md">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // Check deadlines periodically
  useDeadlineChecker();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <CompanyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
                    <Route path="/partners" element={<MainLayout><Partners /></MainLayout>} />
                    <Route path="/projects" element={<MainLayout><Projects /></MainLayout>} />
                    <Route path="/projects/:id" element={<MainLayout><ProjectDetail /></MainLayout>} />
                    <Route path="/sales" element={<MainLayout><Sales /></MainLayout>} />
                    <Route path="/sales/:id" element={<MainLayout><SalesDetail /></MainLayout>} />
                    <Route path="/documents" element={<MainLayout><Documents /></MainLayout>} />
                    <Route path="/calendar" element={<MainLayout><CalendarPage /></MainLayout>} />
                    <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
                    <Route path="/logs" element={<MainLayout><Logs /></MainLayout>} />
                    <Route path="/account-management" element={<MainLayout><AccountManagement /></MainLayout>} />
                    <Route path="/license-generator" element={<LicenseGenerator />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CompanyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
