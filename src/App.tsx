import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { BrandingProvider } from "@/hooks/useBranding";
import { UploadProgressProvider, useUploadProgress } from "@/hooks/useUploadProgress";
import { TourProvider } from "@/hooks/useTour";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { TourGuide } from "@/components/TourGuide";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TenantProvider } from "@/hooks/useTenant";
import { TenantPathProvider } from "@/hooks/useTenantPath";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { FlowModeProvider } from "@/hooks/useFlowMode";
import { isNativeApp } from "@/lib/native-dialer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { LandingOrRedirect } from "@/components/LandingOrRedirect";
import { PaywallGate } from "@/components/PaywallGate";
import { Suspense, lazy } from "react";
import { useAuth } from "@/hooks/useAuth";
// Lazy-loaded page components for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const ControlPanel = lazy(() => import("./pages/ControlPanel"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Work = lazy(() => import("./pages/Work"));
const Leads = lazy(() => import("./pages/Leads"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Reports = lazy(() => import("./pages/Reports"));
const Team = lazy(() => import("./pages/Team"));
const Manage = lazy(() => import("./pages/Manage"));

const ManageLists = lazy(() => import("./pages/ManageLists"));
const ManageClaims = lazy(() => import("./pages/ManageClaims"));
const ManageDuplicates = lazy(() => import("./pages/ManageDuplicates"));
const Preferences = lazy(() => import("./pages/Preferences"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dialer = lazy(() => import("./pages/Dialer"));
const Install = lazy(() => import("./pages/Install"));

const ProductOwnerDashboard = lazy(() => import("./pages/ProductOwnerDashboard"));
// LandingPage is lazy-loaded inside LandingOrRedirect

const CompanionApp = lazy(() => import("./pages/CompanionApp"));
const InsuranceLandingPage = lazy(() => import("./pages/InsuranceLandingPage"));

// FlowCall standalone minimal calling app
import { FlowRoutes } from "./pages/flow/FlowRoutes";

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

/** CRM routes rendered inside the tenant path context */
function CrmRoutes() {
  return (
    <Routes>
      <Route index element={<ProtectedRoute><ControlPanel /></ProtectedRoute>} />
      <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="control-panel" element={<Navigate to="." replace />} />
      <Route path="work" element={<ProtectedRoute><Work /></ProtectedRoute>} />
      <Route path="leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
      <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="manage/users" element={<ProtectedRoute><Team /></ProtectedRoute>} />
      <Route path="manage/lists" element={<ProtectedRoute><ManageLists /></ProtectedRoute>} />
      <Route path="manage/settings" element={<Navigate to="../preferences" replace />} />
      <Route path="manage/account" element={<Navigate to="../preferences" replace />} />
      <Route path="manage/claims" element={<ProtectedRoute><ManageClaims /></ProtectedRoute>} />
      <Route path="manage/duplicates" element={<ProtectedRoute><ManageDuplicates /></ProtectedRoute>} />
      <Route path="preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
      <Route path="settings" element={<Navigate to="../preferences" replace />} />
      <Route path="manage" element={<ProtectedRoute><Manage /></ProtectedRoute>} />
      <Route path="dialer" element={<Dialer />} />
      <Route path="install" element={<Install />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/** Wraps CRM with tenant context, subscription, paywall, and tour */
function TenantCrmApp() {
  const { tenantSlug } = useParams();

  return (
    <TenantPathProvider tenantSlug={tenantSlug!}>
      <TenantProvider>
        <SubscriptionProvider>
          <PaywallGate>
            <TourProvider>
              <CrmRoutes />
              <TourGuide />
            </TourProvider>
          </PaywallGate>
        </SubscriptionProvider>
      </TenantProvider>
    </TenantPathProvider>
  );
}

function AppContent() {
  // Native app → show focused companion UI (not the full CRM)
  if (isNativeApp()) {
    return <CompanionRoutes />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public / auth routes */}
        <Route path="/" element={<LandingOrRedirect />} />
        <Route path="/osiguranja" element={<InsuranceLandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* FlowCall standalone minimal calling assistant */}
        <Route path="/flow/*" element={<FlowRoutes />} />

        {/* Product owner dashboard (root level, no tenant) */}
        <Route path="/aiculedssul" element={
          <ProtectedRoute requiredRoles={["product_owner"]}>
            <ProductOwnerDashboard />
          </ProtectedRoute>
        } />

        {/* CRM tenant routes */}
        <Route path="/t/:tenantSlug/*" element={<TenantCrmApp />} />

        {/* Legacy root manage paths */}
        <Route path="/manage/*" element={<Navigate to="/" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <LanguageProvider>
          <AuthProvider>
            <ErrorBoundary>
              <BrandingProvider>
                <FlowModeProvider>
                <UploadProgressProvider>
                  <OfflineBanner />
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <ErrorBoundary>
                      <AppContent />
                    </ErrorBoundary>
                  </BrowserRouter>
                  <GlobalUploadProgressBar />
                </UploadProgressProvider>
                </FlowModeProvider>
              </BrandingProvider>
            </ErrorBoundary>
          </AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
