import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  List, 
  ArrowRight, 
  Download, 
  Users, 
  Copy, 
  Flag, 
  Code, 
  Settings, 
  ShoppingCart 
} from "lucide-react";
import { Link } from "react-router-dom";

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Pipeline", href: "/manage/pipeline" },
  { label: "Users", href: "/manage/users" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
  { label: "Settings", href: "/manage/settings" },
  { label: "Account", href: "/manage/account" },
];

const menuItems = [
  {
    icon: List,
    title: "Configure Lists",
    description: "Manage and Configure lists",
    href: "/manage/lists",
  },
  {
    icon: ArrowRight,
    title: "Manage Pipeline",
    description: "Manage pipeline automations to move leads between lists with options to filter and change leads in bulk",
    href: "/manage/pipeline",
  },
  {
    icon: Download,
    title: "Export",
    description: "Download leads",
    href: "/manage/export",
  },
  {
    icon: Users,
    title: "Manage Users",
    description: "Add, Delete and Manage Access for Users",
    href: "/team",
  },
  {
    icon: Copy,
    title: "Manage Duplicates",
    description: "Review and merge or delete duplicate leads",
    href: "/manage/duplicates",
  },
  {
    icon: Flag,
    title: "Manage claimed leads",
    description: "View and give back claimed leads",
    href: "/manage/claims",
  },
  {
    icon: Code,
    title: "Manage Integrations",
    description: "Connect and assign emails accounts",
    href: "/manage/integrations",
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Tweak your calling experience, set up restrictions etc.",
    href: "/manage/settings",
  },
  {
    icon: ShoppingCart,
    title: "Account",
    description: "Manage billing, seats, subscription etc.",
    href: "/manage/account",
  },
];

export default function Manage() {
  const [activeTab, setActiveTab] = useState("Lists");

  return (
    <DashboardLayout>
      {/* Sub Navigation */}
      <div className="border-b border-border bg-background">
        <div className="flex gap-6 px-6">
          {subNavItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === item.label
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(item.label)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-4xl">
        <h1 className="text-3xl font-light text-primary mb-2">
          Manage Your Account
        </h1>
        <div className="w-16 h-0.5 bg-primary mb-8" />

        <div className="space-y-6">
          {menuItems.map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className="flex items-start gap-4 group"
            >
              <item.icon className="h-6 w-6 text-foreground mt-0.5 shrink-0" />
              <div>
                <h3 className="text-primary font-medium group-hover:underline">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
