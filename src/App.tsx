import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandingProvider } from "@/hooks/useBranding";
import { UploadProgressProvider, useUploadProgress } from "@/hooks/useUploadProgress";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubdomainRouter } from "@/components/SubdomainRouter";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import ControlPanel from "./pages/ControlPanel";
import Dashboard from "./pages/Dashboard";
import Work from "./pages/Work";
import Leads from "./pages/Leads";
import Campaigns from "./pages/Campaigns";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Manage from "./pages/Manage";

import ManageAccount from "./pages/ManageAccount";
import ManageLists from "./pages/ManageLists";
import ManageClaims from "./pages/ManageClaims";
import ManageDuplicates from "./pages/ManageDuplicates";
import Preferences from "./pages/Preferences";
import NotFound from "./pages/NotFound";
import Dialer from "./pages/Dialer";
import Install from "./pages/Install";
import Register from "./pages/Register";
import ProductOwnerDashboard from "./pages/ProductOwnerDashboard";
import LandingPage from "./pages/LandingPage";
import RegistrationPending from "./pages/RegistrationPending";

const queryClient = new QueryClient();

function GlobalUploadProgressBar() {
  const { uploadProgress } = useUploadProgress();
  return (
    <UploadProgressBar
      isVisible={uploadProgress.isUploading}
      progress={uploadProgress.progress}
      message={uploadProgress.message}
    />
  );
}

function CrmApp() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/register" element={<Register />} />
      <Route path="/registration-pending" element={<RegistrationPending />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/aiculedssul" element={<ProtectedRoute><ProductOwnerDashboard /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><ControlPanel /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/control-panel" element={<Navigate to="/" replace />} />
      <Route path="/work" element={<ProtectedRoute><Work /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/manage/users" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="/manage/lists" element={<ProtectedRoute><ManageLists /></ProtectedRoute>} />
      <Route path="/manage/settings" element={<Navigate to="/preferences" replace />} />
      <Route path="/manage/account" element={<ProtectedRoute><ManageAccount /></ProtectedRoute>} />
      <Route path="/manage/claims" element={<ProtectedRoute><ManageClaims /></ProtectedRoute>} />
      <Route path="/manage/duplicates" element={<ProtectedRoute><ManageDuplicates /></ProtectedRoute>} />
      <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
      <Route path="/settings" element={<Navigate to="/preferences" replace />} />
      <Route path="/manage" element={<ProtectedRoute><Manage /></ProtectedRoute>} />
      <Route path="/dialer" element={<Dialer />} />
      <Route path="/install" element={<Install />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function LandingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/register" element={<Register />} />
      <Route path="/registration-pending" element={<RegistrationPending />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppContent() {
  const hostname = window.location.hostname;
  
  // Check if we're on the root domain (flowcall.eu without subdomain)
  const isRootDomain = hostname === "flowcall.eu" || hostname === "www.flowcall.eu";
  
  if (isRootDomain) {
    return <LandingRoutes />;
  }
  
  // For subdomains or dev/preview, show CRM
  return (
    <SubdomainRouter>
      <CrmApp />
    </SubdomainRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrandingProvider>
          <UploadProgressProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
            <GlobalUploadProgressBar />
          </UploadProgressProvider>
        </BrandingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;