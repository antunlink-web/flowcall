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
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import Work from "./pages/Work";
import Leads from "./pages/Leads";
import Campaigns from "./pages/Campaigns";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Manage from "./pages/Manage";
import ManageSettings from "./pages/ManageSettings";
import ManageAccount from "./pages/ManageAccount";
import ManageLists from "./pages/ManageLists";
import ManageClaims from "./pages/ManageClaims";
import ManageDuplicates from "./pages/ManageDuplicates";
import Preferences from "./pages/Preferences";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrandingProvider>
          <UploadProgressProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/work" element={<ProtectedRoute><Work /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
                <Route path="/manage/users" element={<ProtectedRoute><Team /></ProtectedRoute>} />
                <Route path="/manage/lists" element={<ProtectedRoute><ManageLists /></ProtectedRoute>} />
                <Route path="/manage/settings" element={<ProtectedRoute><ManageSettings /></ProtectedRoute>} />
                <Route path="/manage/account" element={<ProtectedRoute><ManageAccount /></ProtectedRoute>} />
                <Route path="/manage/claims" element={<ProtectedRoute><ManageClaims /></ProtectedRoute>} />
                <Route path="/manage/duplicates" element={<ProtectedRoute><ManageDuplicates /></ProtectedRoute>} />
                <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
                <Route path="/settings" element={<Navigate to="/manage/settings" replace />} />
                <Route path="/manage" element={<ProtectedRoute><Manage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <GlobalUploadProgressBar />
          </UploadProgressProvider>
        </BrandingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;