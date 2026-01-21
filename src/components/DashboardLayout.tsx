import { ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="pt-14 min-h-screen">
        {children}
      </main>
    </div>
  );
}
