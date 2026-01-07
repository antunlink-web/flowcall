import { ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[hsl(210,20%,96%)]">
      <TopNavbar />
      <main className="pt-12 min-h-screen">
        {children}
      </main>
    </div>
  );
}
