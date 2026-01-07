import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Linkedin,
  X,
  Phone,
  Edit,
  ThumbsUp,
  ThumbsDown,
  Archive,
  RefreshCw,
  Info,
  Bold,
  Italic,
  Strikethrough,
  LinkIcon,
  Quote,
  Code,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Undo,
  Redo,
  Paperclip,
  Loader2,
} from "lucide-react";
import { useLists, List, ListField, extractFieldsFromCsv } from "@/hooks/useLists";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { FieldsEditor } from "@/components/lists/FieldsEditor";
import { ImportLeadsDialog } from "@/components/lists/ImportLeadsDialog";
import { UploadProgressBar } from "@/components/UploadProgressBar";
import { format } from "date-fns";

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

const mockUsers = [
  { id: "1", name: "Agent User", checked: true },
];

const mockEmailTemplates = [
  { id: "1", name: "Follow Up", subject: "Following up on our conversation", body: "Hello, I wanted to follow up..." },
];

export default function ManageLists() {
  const location = useLocation();
  const { lists, loading, uploadProgress, createList, updateList, deleteList, importLeadsFromCsv } = useLists();
  
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "blocklists">("active");
  const [configureList, setConfigureList] = useState<List | null>(null);
  const [configSection, setConfigSection] = useState("fields");
  const [editedFields, setEditedFields] = useState<ListField[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [listName, setListName] = useState("");
  const [listSettings, setListSettings] = useState(configureList?.settings || {});

  const activeLists = lists.filter((l) => l.status === "active");
  const archivedLists = lists.filter((l) => l.status === "archived");
  const blocklists = lists.filter((l) => l.status === "blocklist");

  const handleCreateList = async (
    name: string,
    fields: ListField[],
    description: string,
    csvContent: string
  ) => {
    const newList = await createList(name, fields, description);
    if (newList && csvContent) {
      await importLeadsFromCsv(newList.id, csvContent);
    }
    setShowCreateDialog(false);
  };

  const handleConfigureList = (list: List) => {
    setConfigureList(list);
    setEditedFields([...list.fields]);
    setListName(list.name);
    setListSettings(list.settings || {});
    setConfigSection("fields");
  };

  const handleSaveFields = async () => {
    if (!configureList) return;
    const success = await updateList(configureList.id, { fields: editedFields });
    if (success) {
      setConfigureList({ ...configureList, fields: editedFields });
    }
  };

  const handleSaveSettings = async () => {
    if (!configureList) return;
    await updateList(configureList.id, { 
      name: listName, 
      settings: listSettings 
    });
    setConfigureList({ ...configureList, name: listName, settings: listSettings });
  };

  const handleArchiveList = async () => {
    if (!configureList) return;
    await updateList(configureList.id, { status: "archived" });
    setConfigureList(null);
  };

  const handleDeleteList = async () => {
    if (!configureList) return;
    if (window.confirm(`Are you sure you want to permanently delete "${configureList.name}"? This cannot be undone.`)) {
      await deleteList(configureList.id);
      setConfigureList(null);
    }
  };

  const handleImportLeads = async (csvContent: string) => {
    if (!configureList) return;
    await importLeadsFromCsv(configureList.id, csvContent);
  };

  const renderBadge = (value: number, color: string) => (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${color}`}>
      {value.toLocaleString()}
    </span>
  );

  const renderListsTable = (listsToRender: List[]) => (
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
          {listsToRender.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-muted-foreground">
                No lists found. Create a new list to get started.
              </td>
            </tr>
          ) : (
            listsToRender.map((list) => (
              <tr key={list.id} className="border-t border-border">
                <td className="p-3">
                  <button
                    onClick={() => handleConfigureList(list)}
                    className="text-primary hover:underline font-medium"
                  >
                    {list.name}
                  </button>
                </td>
                <td className="p-3 text-center">{renderBadge(list.total || 0, "bg-slate-500")}</td>
                <td className="p-3 text-center">{renderBadge(list.new || 0, "bg-blue-500")}</td>
                <td className="p-3 text-center">{renderBadge(list.callback || 0, "bg-green-500")}</td>
                <td className="p-3 text-center">{renderBadge(list.won || 0, "bg-teal-500")}</td>
                <td className="p-3 text-center">{renderBadge(list.lost || 0, "bg-red-500")}</td>
                <td className="p-3 text-sm">{format(new Date(list.created_at), "dd-MM-yyyy")}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        handleConfigureList(list);
                        setShowImportDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleConfigureList(list)}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderConfigContent = () => {
    if (!configureList) return null;

    switch (configSection) {
      case "fields":
        return (
          <FieldsEditor
            fields={editedFields}
            onFieldsChange={setEditedFields}
            onSave={handleSaveFields}
          />
        );

      case "users":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              Select which users has access to this list
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 pl-20">
                <Checkbox id="check-all" defaultChecked />
                <Label htmlFor="check-all" className="font-medium">Check All</Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Label className="w-16 text-right font-medium">Users</Label>
                  <div className="space-y-2">
                    {mockUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3">
                        <Checkbox id={user.id} defaultChecked={user.checked} />
                        <Label htmlFor={user.id}>{user.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pl-20">
                <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-medium text-foreground mb-4">General Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Label className="w-24 text-right">
                    <span className="text-destructive">*</span> Name
                  </Label>
                  <Input 
                    value={listName} 
                    onChange={(e) => setListName(e.target.value)}
                    className="max-w-md" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-4">
                    <Label className="w-24 text-right pt-2">Prepend phone</Label>
                    <div className="space-y-2">
                      <Input 
                        value={listSettings.prependPhone || ""} 
                        onChange={(e) => setListSettings({ ...listSettings, prependPhone: e.target.value })}
                        className="max-w-md" 
                      />
                      <p className="text-sm text-primary">
                        Prepend all phone numbers with this by default <strong>unless</strong> the number already starts with "+" or the same value as provided here.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pl-28">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="inline-identifiers" 
                      checked={listSettings.inlineIdentifiers}
                      onCheckedChange={(checked) => setListSettings({ ...listSettings, inlineIdentifiers: !!checked })}
                    />
                    <div>
                      <Label htmlFor="inline-identifiers">Inline identifiers</Label>
                      <p className="text-sm text-muted-foreground">Show the first two fields on one line</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="lock-defaults" 
                      checked={listSettings.lockOnDefaults}
                      onCheckedChange={(checked) => setListSettings({ ...listSettings, lockOnDefaults: !!checked })}
                    />
                    <div>
                      <Label htmlFor="lock-defaults">Lock on defaults</Label>
                      <p className="text-sm text-muted-foreground">Do not allow changes to our standard fields.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="blocklist" 
                      checked={listSettings.isBlocklist}
                      onCheckedChange={(checked) => setListSettings({ ...listSettings, isBlocklist: !!checked })}
                    />
                    <div>
                      <Label htmlFor="blocklist">Blocklist</Label>
                      <p className="text-sm text-primary">Use this list as a no-call/blocklist list when deduplicating.</p>
                    </div>
                  </div>

                  <Button onClick={handleSaveSettings} className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-foreground mb-4">Email Settings</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Label className="w-24 text-right pt-2">CC Email</Label>
                  <div className="space-y-2">
                    <Input 
                      value={listSettings.ccEmail || ""} 
                      onChange={(e) => setListSettings({ ...listSettings, ccEmail: e.target.value })}
                      className="max-w-md" 
                    />
                    <p className="text-sm text-muted-foreground">
                      If provided this email address will be CC on every email sent to leads on this list.
                    </p>
                  </div>
                </div>
                <div className="pl-28">
                  <Button onClick={handleSaveSettings} className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "queueing":
        return (
          <div className="flex gap-8">
            <div className="flex-1 space-y-6">
              <div className="bg-muted/50 border border-border rounded p-4 text-sm space-y-3">
                <p>The list specific queue settings allow you to prioritise new leads over follow-ups.</p>
                <p><strong>Please note:</strong> Users can also add filters to their queue and control sorting of unscheduled leads.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Priority</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="prioritise-new" 
                      checked={listSettings.prioritiseNewLeads}
                      onCheckedChange={(checked) => setListSettings({ ...listSettings, prioritiseNewLeads: !!checked })}
                    />
                    <div>
                      <Label htmlFor="prioritise-new">Prioritise New leads over postponed leads</Label>
                      <p className="text-sm text-muted-foreground">Always put new leads before call backs in the queue.</p>
                    </div>
                  </div>

                  <Button onClick={handleSaveSettings} className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "dedupe":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm space-y-3">
              <p>By default, duplicates are matched by phone numbers and email addresses.</p>
              <p>You can configure additional matching criteria here.</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Checkbox id="match-phone" defaultChecked />
                <div>
                  <Label htmlFor="match-phone" className="font-medium">Duplicates match on phone</Label>
                  <p className="text-sm text-muted-foreground">Use phone numbers when detecting duplicates</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox id="match-email" defaultChecked />
                <div>
                  <Label htmlFor="match-email" className="font-medium">Duplicates match on email</Label>
                  <p className="text-sm text-muted-foreground">Use emails when detecting duplicates</p>
                </div>
              </div>

              {editedFields.length > 0 && (
                <div className="flex items-center gap-4">
                  <Label className="w-20 text-right">Match on</Label>
                  <Select>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select custom field" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {editedFields.map((field) => (
                        <SelectItem key={field.id} value={field.name}>{field.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
            </div>
          </div>
        );

      case "expiration":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Configure lead expiration settings for this list. Leads can automatically expire after a set period of inactivity.</p>
            </div>
            <p className="text-muted-foreground">Expiration settings coming soon.</p>
          </div>
        );

      case "categories":
        return (
          <div className="flex gap-8">
            <div className="flex-1 space-y-6">
              <div className="bg-muted/50 border border-border rounded p-4 text-sm space-y-2">
                <p>Add custom categories to each state, so that agents can choose a category when finishing a call.</p>
              </div>

              <div className="bg-blue-100 border border-blue-300 rounded p-3 flex items-center gap-2 text-sm text-blue-800">
                <Info className="h-4 w-4" />
                <span>Separate categories by comma (,)</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Call back categories</Label>
                  <Input defaultValue="Call again, Busy" className="flex-1" />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Winner categories</Label>
                  <Input defaultValue="Sold, Interested" className="flex-1" />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Loser categories</Label>
                  <Input defaultValue="Not interested, Wrong number" className="flex-1" />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Archive categories</Label>
                  <Input className="flex-1" />
                </div>

                <div className="pl-44">
                  <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>

            <div className="w-48">
              <h3 className="text-lg font-medium mb-4">Preview</h3>
              <div className="space-y-3">
                <Button className="w-full bg-teal-500 hover:bg-teal-600 justify-between">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Call back
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button className="w-full bg-green-500 hover:bg-green-600 justify-between">
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    Winner
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button className="w-full bg-red-500 hover:bg-red-600 justify-between">
                  <span className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4" />
                    Loser
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button className="w-full bg-slate-500 hover:bg-slate-600 justify-between">
                  <span className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Archive
                  </span>
                </Button>
              </div>
            </div>
          </div>
        );

      case "script":
        return (
          <div className="flex gap-8">
            <div className="flex-1 space-y-4">
              <div className="border border-border rounded-t flex items-center gap-1 p-2 bg-muted/30">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Strikethrough className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><LinkIcon className="h-4 w-4" /></Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8"><Quote className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Code className="h-4 w-4" /></Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8"><ListIcon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><ListOrderedIcon className="h-4 w-4" /></Button>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8"><Undo className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Redo className="h-4 w-4" /></Button>
              </div>
              
              <Textarea 
                className="min-h-[200px] rounded-t-none -mt-4" 
                placeholder="Enter your call script here..."
                value={listSettings.script || ""}
                onChange={(e) => setListSettings({ ...listSettings, script: e.target.value })}
              />

              <div className="space-y-2">
                <Label>Insert merge tag</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field name to insert as merge tag" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {editedFields.map((field) => (
                      <SelectItem key={field.id} value={field.name}>{field.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveSettings} className="bg-destructive hover:bg-destructive/90">Save</Button>
            </div>

            <div className="w-80">
              <div className="border border-border rounded-lg">
                <div className="p-4">
                  <h3 className="font-medium mb-2">Available merge tags</h3>
                  <p className="text-sm text-muted-foreground mb-4">Copy merge tags to use in your script.</p>
                  
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Field Name</th>
                        <th className="text-left py-2 font-medium">Merge Tag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedFields.map((field) => (
                        <tr key={field.id} className="border-b">
                          <td className="py-2">{field.name}</td>
                          <td className="py-2">
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">
                              {"{{ " + field.name.toLowerCase().replace(/\s+/g, "_") + " }}"}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case "segments":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Segments allow you to create filtered views of your leads based on specific criteria.</p>
            </div>
            <p className="text-muted-foreground">No segments configured yet.</p>
            <Button className="bg-destructive hover:bg-destructive/90">
              <Plus className="h-4 w-4 mr-2" />
              New Segment
            </Button>
          </div>
        );

      case "emails":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Email templates are pre-written emails that let you merge in lead information automatically.</p>
            </div>

            <Button className="bg-destructive hover:bg-destructive/90">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Subject</th>
                    <th className="text-left p-3 font-medium">Body</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockEmailTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No email templates configured yet.
                      </td>
                    </tr>
                  ) : (
                    mockEmailTemplates.map((template) => (
                      <tr key={template.id} className="border-t border-border">
                        <td className="p-3 text-primary">{template.name}</td>
                        <td className="p-3">{template.subject}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-xs">{template.body}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "texts":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Text templates are pre-written messages that let you merge in lead information automatically.</p>
            </div>

            <Button className="bg-destructive hover:bg-destructive/90">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Body</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                      No text templates configured yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case "delete":
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200">
                <h3 className="text-amber-800 font-medium">Archive this list</h3>
              </div>
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-2 text-sm">
                  <p>Archiving a list will result in the following:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>The list is removed from your agents (they can't work it anymore)</li>
                    <li>Duplicate detection will not take leads from this list into account</li>
                    <li>Reporting will continue to show historical stats for this list</li>
                  </ul>
                  <p>An archived list can be fully restored if necessary.</p>
                </div>
                <Button onClick={handleArchiveList} className="bg-destructive hover:bg-destructive/90 shrink-0">
                  Archive List
                </Button>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-red-200">
                <h3 className="text-red-800 font-medium">Permanently delete this list</h3>
              </div>
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-2 text-sm">
                  <p className="text-red-600">If you delete {configureList.name}, all its leads and their data will be permanently lost.</p>
                  <p className="font-medium">You cannot undo this action. Deleted lists cannot be restored.</p>
                </div>
                <Button onClick={handleDeleteList} variant="destructive" className="shrink-0">
                  Delete List
                </Button>
              </div>
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (configureList) {
    return (
      <>
        <UploadProgressBar
          isVisible={uploadProgress.isUploading}
          progress={uploadProgress.progress}
          message={uploadProgress.message}
        />
        <DashboardLayout>
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

        <div className="flex min-h-[calc(100vh-120px)]">
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
                      {(configureList.total || 0).toLocaleString()} leads
                    </span>
                  </h1>
                  <div className="w-16 h-0.5 bg-primary mt-2" />
                </div>

                {renderConfigContent()}
              </div>

              <div className="w-80">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-medium">Lead Previews</span>
                    <span className="text-muted-foreground ml-1">this is how leads will look to your agents:</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">New</span>
                        <span className="font-bold">Sample Lead</span>
                      </div>
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <ArrowRight className="h-5 w-5 text-white" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-primary">
                      <Phone className="h-4 w-4" />
                      <span>+1 555 123 4567</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {editedFields.slice(0, 5).map((field) => (
                        <div key={field.id} className="grid grid-cols-[auto_1fr] gap-x-4">
                          <span className="text-right font-medium">{field.name}</span>
                          <span className="text-muted-foreground">Sample value</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        className="bg-destructive hover:bg-destructive/90 flex-1"
                        onClick={() => setShowImportDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add leads
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ImportLeadsDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          listName={configureList.name}
          listFields={editedFields}
          onImport={handleImportLeads}
        />
      </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <UploadProgressBar
        isVisible={uploadProgress.isUploading}
        progress={uploadProgress.progress}
        message={uploadProgress.message}
      />
      <DashboardLayout>
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

        <div className="p-8">
          <div className="max-w-6xl">
            <div className="mb-8">
              <h1 className="text-3xl font-light text-primary italic mb-2">Manage Lists</h1>
              <div className="w-16 h-0.5 bg-primary" />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("active")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "active"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active ({activeLists.length})
                </button>
                <button
                  onClick={() => setActiveTab("archived")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "archived"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Archived ({archivedLists.length})
                </button>
                <button
                  onClick={() => setActiveTab("blocklists")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "blocklists"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Blocklists ({blocklists.length})
                </button>
              </div>

              <Button onClick={() => setShowCreateDialog(true)} className="bg-destructive hover:bg-destructive/90">
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </div>

            {activeTab === "active" && renderListsTable(activeLists)}
            {activeTab === "archived" && renderListsTable(archivedLists)}
            {activeTab === "blocklists" && renderListsTable(blocklists)}
          </div>
        </div>

        <CreateListDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateList={handleCreateList}
        />
      </DashboardLayout>
    </>
  );
}
