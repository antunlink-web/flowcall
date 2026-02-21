import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { BrandingProvider } from "@/hooks/useBranding";
import { UploadProgressProvider, useUploadProgress } from "@/hooks/useUploadProgress";
import { TourProvider } from "@/hooks/useTour";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { TourGuide } from "@/components/TourGuide";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubdomainRouter } from "@/components/SubdomainRouter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TenantProvider } from "@/hooks/useTenant";
import { isNativeApp } from "@/lib/native-dialer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Suspense, lazy } from "react";

// Lazy-loaded page components for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const ControlPanel = lazy(() => import("./pages/ControlPanel"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Work = lazy(() => import("./pages/Work"));
const Leads = lazy(() => import("./pages/Leads"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Reports = lazy(() => import("./pages/Reports"));
const Team = lazy(() => import("./pages/Team"));
const Manage = lazy(() => import("./pages/Manage"));
const ManageAccount = lazy(() => import("./pages/ManageAccount"));
const ManageLists = lazy(() => import("./pages/ManageLists"));
const ManageClaims = lazy(() => import("./pages/ManageClaims"));
const ManageDuplicates = lazy(() => import("./pages/ManageDuplicates"));
const Preferences = lazy(() => import("./pages/Preferences"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dialer = lazy(() => import("./pages/Dialer"));
const Install = lazy(() => import("./pages/Install"));
const Register = lazy(() => import("./pages/Register"));
const ProductOwnerDashboard = lazy(() => import("./pages/ProductOwnerDashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const RegistrationPending = lazy(() => import("./pages/RegistrationPending"));
const CompanionApp = lazy(() => import("./pages/CompanionApp"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

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

/** Shown only on the native Android/iOS app — a focused companion UI */
function CompanionRoutes() {
  const { user, loading } = useAuth();

  console.log("[CompanionRoutes] loading:", loading, "user:", user?.id ?? "null");

  if (loading) return null;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="*"
          element={
            user ? (
              <ErrorBoundary>
                <CompanionApp />
              </ErrorBoundary>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
      </Routes>
    </Suspense>
  );
}

function CrmApp() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/register" element={<Register />} />
        <Route path="/registration-pending" element={<RegistrationPending />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/aiculedssul" element={<ProtectedRoute requiredRoles={["product_owner"]}><ProductOwnerDashboard /></ProtectedRoute>} />
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
    </Suspense>
  );
}

function LandingRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/register" element={<Register />} />
        <Route path="/registration-pending" element={<RegistrationPending />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/aiculedssul" element={
          <TenantProvider>
            <ProtectedRoute>
              <ProductOwnerDashboard />
            </ProtectedRoute>
          </TenantProvider>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const hostname = window.location.hostname;

  // Native app → show focused companion UI (not the full CRM)
  if (isNativeApp()) {
    return <CompanionRoutes />;
  }

  // Check if we're on the root domain (flowcall.eu without subdomain)
  const isRootDomain = hostname === "flowcall.eu" || hostname === "www.flowcall.eu";

  if (isRootDomain) {
    return <LandingRoutes />;
  }

  // Subdomains / dev / preview → full CRM
  return (
    <SubdomainRouter>
      <CrmApp />
      <TourGuide />
    </SubdomainRouter>
  );
}


const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthProvider>
            <ErrorBoundary>
              <BrandingProvider>
                <UploadProgressProvider>
                  <TourProvider>
                    <OfflineBanner />
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <ErrorBoundary>
                        <AppContent />
                      </ErrorBoundary>
                    </BrowserRouter>
                    <GlobalUploadProgressBar />
                  </TourProvider>
                </UploadProgressProvider>
              </BrandingProvider>
            </ErrorBoundary>
          </AuthProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;