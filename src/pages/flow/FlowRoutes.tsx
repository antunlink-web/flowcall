import { Routes, Route } from "react-router-dom";
import { FlowLayout } from "@/components/flow/FlowLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";
import { TenantProvider } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const FlowDashboard = lazy(() => import("@/pages/flow/FlowDashboard"));
const FlowSession = lazy(() => import("@/pages/flow/FlowSession"));
const FlowPipeline = lazy(() => import("@/pages/flow/FlowPipeline"));
const FlowContacts = lazy(() => import("@/pages/flow/FlowContacts"));
const FlowLeadDetail = lazy(() => import("@/pages/flow/FlowLeadDetail"));

function FlowLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export function FlowRoutes() {
  return (
    <ProtectedRoute>
      <TenantProvider>
        <FlowLayout>
          <Suspense fallback={<FlowLoader />}>
            <Routes>
              <Route index element={<FlowDashboard />} />
              <Route path="session" element={<FlowSession />} />
              <Route path="pipeline" element={<FlowPipeline />} />
              <Route path="contacts" element={<FlowContacts />} />
              <Route path="lead/:leadId" element={<FlowLeadDetail />} />
            </Routes>
          </Suspense>
        </FlowLayout>
      </TenantProvider>
    </ProtectedRoute>
  );
}
