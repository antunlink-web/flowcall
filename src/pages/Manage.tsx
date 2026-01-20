import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  List, 
  Users, 
  Copy, 
  Flag, 
  CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";

const menuItems = [
  {
    icon: List,
    title: "Configure Lists",
    description: "Manage and Configure lists",
    href: "/manage/lists",
  },
  {
    icon: Users,
    title: "Manage Users",
    description: "Add, Delete and Manage Access for Users",
    href: "/manage/users",
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
    icon: CreditCard,
    title: "Account",
    description: "Manage billing, seats, subscription etc.",
    href: "/manage/account",
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
