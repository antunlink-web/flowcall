import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutGrid,
  Users,
  Settings,
  ListOrdered,
  Copy,
  Clock,
  Tag,
  FileText,
  LayoutList,
  Mail,
  MessageSquare,
  Trash2,
  Plus,
  Settings2,
  MoreHorizontal,
  GripVertical,
  ChevronRight,
  ArrowRight,
  Linkedin,
  X,
  Phone,
} from "lucide-react";

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Pipeline", href: "/manage/pipeline" },
  { label: "Users", href: "/manage/users" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
  { label: "Settings", href: "/manage/settings" },
  { label: "Account", href: "/manage/account" },
];

const configSidebarItems = [
  { icon: LayoutGrid, label: "Fields", id: "fields" },
  { icon: Users, label: "Users", id: "users" },
  { icon: Settings, label: "Settings", id: "settings" },
  { icon: ListOrdered, label: "Queueing", id: "queueing" },
  { icon: Copy, label: "Dedupe", id: "dedupe" },
  { icon: Clock, label: "Expiration", id: "expiration" },
  { icon: Tag, label: "Categories", id: "categories" },
  { icon: FileText, label: "Script", id: "script" },
  { icon: LayoutList, label: "Segments", id: "segments" },
  { icon: Mail, label: "E-mails", id: "emails" },
  { icon: MessageSquare, label: "Texts", id: "texts" },
  { icon: Trash2, label: "Delete", id: "delete" },
];

const mockLists = [
  {
    id: "1",
    name: "PAGALBA VAIKAMS",
    total: 123375,
    new: 110152,
    callback: 7911,
    won: 202,
    lost: 5108,
    created: "23-06-2025",
    archived: false,
  },
];

const mockArchivedLists = [
  {
    id: "2",
    name: "OLD CAMPAIGN",
    total: 5000,
    new: 0,
    callback: 0,
    won: 2500,
    lost: 2500,
    created: "01-01-2025",
    archived: true,
  },
];

const mockFields = [
  { id: "1", name: "Įmonė", type: "String (standard)", show: true },
  { id: "2", name: "Telefonas (1)", type: "Phone", show: true },
  { id: "3", name: "Telefonas (2)", type: "Phone", show: true },
  { id: "4", name: "Telefonas (3)", type: "Phone", show: true },
  { id: "5", name: "EMAIL", type: "E-mail", show: true },
  { id: "6", name: "MOKETOJO KODAS", type: "String (standard)", show: true },
  { id: "7", name: "Rekvizitai URL", type: "www", show: true },
  { id: "8", name: "Svetainė", type: "String (standard)", show: true },
  { id: "9", name: "Vadovas", type: "String (standard)", show: true },
  { id: "10", name: "REMARK", type: "String (standard)", show: true },
  { id: "11", name: "DATE", type: "String (standard)", show: true },
];

export default function ManageLists() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "blocklists">("active");
  const [configureList, setConfigureList] = useState<typeof mockLists[0] | null>(null);
  const [configSection, setConfigSection] = useState("fields");
  const [fields, setFields] = useState(mockFields);

  const renderBadge = (value: number, color: string) => (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${color}`}>
      {value.toLocaleString()}
    </span>
  );

  const renderListsTable = (lists: typeof mockLists) => (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium">List Name</th>
            <th className="text-center p-3 font-medium">Total</th>
            <th className="text-center p-3 font-medium">New</th>
            <th className="text-center p-3 font-medium">Call back</th>
            <th className="text-center p-3 font-medium">Won</th>
            <th className="text-center p-3 font-medium">Lost</th>
            <th className="text-left p-3 font-medium">Created</th>
            <th className="text-right p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {lists.map((list) => (
            <tr key={list.id} className="border-t border-border">
              <td className="p-3">
                <button
                  onClick={() => setConfigureList(list)}
                  className="text-primary hover:underline font-medium"
                >
                  {list.name}
                </button>
              </td>
              <td className="p-3 text-center">{renderBadge(list.total, "bg-slate-500")}</td>
              <td className="p-3 text-center">{renderBadge(list.new, "bg-blue-500")}</td>
              <td className="p-3 text-center">{renderBadge(list.callback, "bg-green-500")}</td>
              <td className="p-3 text-center">{renderBadge(list.won, "bg-teal-500")}</td>
              <td className="p-3 text-center">{renderBadge(list.lost, "bg-red-500")}</td>
              <td className="p-3 text-sm">{list.created}</td>
              <td className="p-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setConfigureList(list)}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderConfigContent = () => {
    switch (configSection) {
      case "fields":
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
              <span className="font-medium text-blue-800">Hint:</span>
              <span className="text-blue-700"> Grab the </span>
              <GripVertical className="inline h-4 w-4 text-blue-700" />
              <span className="text-blue-700"> and drag to arrange the order in which lead information is shown</span>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[40px_1fr_150px_40px_60px_40px] gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                <div></div>
                <div>Field Name</div>
                <div>Type</div>
                <div></div>
                <div className="text-center">Show</div>
                <div></div>
              </div>

              {fields.map((field) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[40px_1fr_150px_40px_60px_40px] gap-2 items-center bg-background border border-border rounded p-2"
                >
                  <div className="flex items-center justify-center cursor-move">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input defaultValue={field.name} className="h-9" />
                  <Select defaultValue={field.type}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="String (standard)">String (standard)</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="E-mail">E-mail</SelectItem>
                      <SelectItem value="www">www</SelectItem>
                      <SelectItem value="Number">Number</SelectItem>
                      <SelectItem value="Date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center justify-center">
                    <Checkbox defaultChecked={field.show} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button variant="ghost" className="text-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add field
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center text-muted-foreground py-12">
            <p>Select a section from the sidebar</p>
          </div>
        );
    }
  };

  if (configureList) {
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
                  location.pathname === item.href
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Configuration View */}
        <div className="flex min-h-[calc(100vh-120px)]">
          {/* Sidebar */}
          <div className="w-56 border-r border-border bg-background">
            <nav className="p-2">
              {configSidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setConfigSection(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded text-sm transition-colors ${
                    configSection === item.id
                      ? "text-primary font-medium"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${configSection === item.id ? "text-primary" : ""}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${configSection === item.id ? "text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8 overflow-auto">
            <div className="flex gap-8">
              <div className="flex-1">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setConfigureList(null)}
                      className="text-primary hover:underline"
                    >
                      ← Back to Lists
                    </button>
                  </div>
                  <h1 className="text-3xl font-light text-primary italic">
                    Configure "{configureList.name}"
                    <span className="text-muted-foreground text-xl ml-2 not-italic">
                      {configureList.total.toLocaleString()} leads
                    </span>
                  </h1>
                  <div className="w-16 h-0.5 bg-primary mt-2" />
                </div>

                {renderConfigContent()}
              </div>

              {/* Lead Preview Card */}
              <div className="w-80">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-medium">Lead Previews</span>
                    <span className="text-muted-foreground ml-1">this is how leads will look to your agents:</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">Lost</span>
                        <span className="font-bold">Korijus, UAB</span>
                        <Linkedin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-white" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-primary">
                      <Phone className="h-4 w-4" />
                      <span>+370 698 25655</span>
                      <X className="h-3 w-3 cursor-pointer" />
                    </div>

                    <div className="text-center">
                      <X className="h-4 w-4 mx-auto text-muted-foreground" />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="text-right font-medium">Moketojo kodas</span>
                        <span>304473021</span>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="text-right font-medium">Rekvizitai url</span>
                        <a href="#" className="text-primary hover:underline">rekvizitai.vz.lt/imone/korijus/</a>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="text-right font-medium">Vadovas</span>
                        <span>Edvinas Navickas</span>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="text-right font-medium">Date</span>
                        <span>18.03.2025</span>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="text-right font-medium">Category</span>
                        <span>Not interested</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-1 text-xs text-muted-foreground">
                      <div className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="text-right font-medium">First created</span>
                        <span>23-06-2025 12:53 (7 months ago)</span>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="text-right font-medium">Last updated</span>
                        <span>25-06-2025 14:28 (7 months ago)</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button className="bg-destructive hover:bg-destructive/90 flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Start calling now
                      </Button>
                      <Button variant="outline" className="flex items-center gap-1">
                        <Plus className="h-4 w-4" />
                        Add leads
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                location.pathname === item.href
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-primary italic mb-2">Manage Lists</h1>
            <div className="w-16 h-0.5 bg-primary" />
          </div>

          <div className="flex items-center justify-between mb-6">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "active"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Active ({mockLists.length})
              </button>
              <button
                onClick={() => setActiveTab("archived")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "archived"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Archived ({mockArchivedLists.length})
              </button>
              <button
                onClick={() => setActiveTab("blocklists")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "blocklists"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Blocklists (0)
              </button>
            </div>

            <Button className="bg-destructive hover:bg-destructive/90">
              <Plus className="h-4 w-4 mr-2" />
              Add a new list
            </Button>
          </div>

          {activeTab === "active" && renderListsTable(mockLists)}
          {activeTab === "archived" && renderListsTable(mockArchivedLists)}
          {activeTab === "blocklists" && (
            <div className="text-center text-muted-foreground py-12 border border-border rounded">
              <p>No blocklists found</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}