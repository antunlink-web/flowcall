import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  List, 
  Users, 
  Copy, 
  Flag, 
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";

const menuItems = [
  {
    icon: List,
    title: "Lists",
    description: "Manage and configure lists",
    href: "/manage/lists",
    disabled: false,
  },
  {
    icon: Users,
    title: "Users",
    description: "Add, delete and manage access for users",
    href: "/manage/users",
    disabled: false,
  },
  {
    icon: Copy,
    title: "Duplicates",
    description: "Review and merge or delete duplicate leads",
    href: "/manage/duplicates",
    disabled: false,
  },
  {
    icon: Flag,
    title: "Claims",
    description: "View and give back claimed leads",
    href: "/manage/claims",
    disabled: false,
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Configure your preferences and options",
    href: "/preferences",
    disabled: false,
  },
];

export default function Manage() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-3xl font-light text-primary mb-2">
          Manage Your Account
        </h1>
        <div className="w-16 h-0.5 bg-primary mb-8" />

        <div className="space-y-6">
          {menuItems.map((item) => 
            item.disabled ? (
              <div
                key={item.title}
                className="flex items-start gap-4 opacity-50 cursor-not-allowed"
              >
                <item.icon className="h-6 w-6 text-foreground mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-primary font-medium">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ) : (
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
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
