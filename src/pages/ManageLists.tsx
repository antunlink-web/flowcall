import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  PhoneCall,
  Eye,
  Upload,
  Download,
  UserPlus,
  Workflow,
} from "lucide-react";
import { useLists, List, ListField, extractFieldsFromCsv } from "@/hooks/useLists";
import { useListTemplates, EmailTemplate, SmsTemplate, CallScript, ListEmailConfig } from "@/hooks/useListTemplates";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { FieldsEditor } from "@/components/lists/FieldsEditor";
import { ImportLeadsDialog } from "@/components/lists/ImportLeadsDialog";
import { EmailTemplateEditor } from "@/components/lists/EmailTemplateEditor";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Users", href: "/manage/users" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
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
  { icon: FileText, label: "Scripts", id: "scripts" },
  { icon: LayoutList, label: "Segments", id: "segments" },
  { icon: Mail, label: "E-mails", id: "emails" },
  { icon: MessageSquare, label: "Texts", id: "texts" },
  { icon: Trash2, label: "Delete", id: "delete" },
];

interface UserWithAccess {
  id: string;
  email: string;
  full_name: string | null;
  hasAccess: boolean;
}

export default function ManageLists() {
  const location = useLocation();
  const { toast } = useToast();
  const { lists, loading, uploadProgress, createList, updateList, deleteList, importLeadsFromData } = useLists();
  
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "blocklists">("active");
  const [configureList, setConfigureList] = useState<List | null>(null);
  const [configSection, setConfigSection] = useState("fields");
  const [editedFields, setEditedFields] = useState<ListField[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [listName, setListName] = useState("");
  const [listSettings, setListSettings] = useState(configureList?.settings || {});
  const [previewLead, setPreviewLead] = useState<Record<string, string> | null>(null);
  const [emailConfig, setEmailConfig] = useState<ListEmailConfig>({});
  
  // Categories state
  const [callbackCategories, setCallbackCategories] = useState("Call again, Busy");
  const [winnerCategories, setWinnerCategories] = useState("Sold, Interested");
  const [loserCategories, setLoserCategories] = useState("Not interested, Wrong number");
  const [archiveCategories, setArchiveCategories] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // Template management state
  const [showEmailTemplateDialog, setShowEmailTemplateDialog] = useState(false);
  const [showSmsTemplateDialog, setShowSmsTemplateDialog] = useState(false);
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<EmailTemplate | null>(null);
  const [editingSmsTemplate, setEditingSmsTemplate] = useState<SmsTemplate | null>(null);
  const [editingScript, setEditingScript] = useState<CallScript | null>(null);
  const [previewingEmailTemplate, setPreviewingEmailTemplate] = useState<EmailTemplate | null>(null);
  
  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  
  // Users for list access
  const [allUsers, setAllUsers] = useState<UserWithAccess[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUsers, setSavingUsers] = useState(false);
  // Use the templates hook
  const {
    emailTemplates,
    smsTemplates,
    callScripts,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    createSmsTemplate,
    updateSmsTemplate,
    deleteSmsTemplate,
    createCallScript,
    updateCallScript,
    deleteCallScript,
  } = useListTemplates(configureList?.id || null);

  const activeLists = lists.filter((l) => l.status === "active");
  const archivedLists = lists.filter((l) => l.status === "archived");
  const blocklists = lists.filter((l) => l.status === "blocklist");

  // Fetch a sample lead for preview when configureList changes
  useEffect(() => {
    const fetchPreviewLead = async () => {
      if (!configureList) {
        setPreviewLead(null);
        return;
      }
      
      const { data } = await supabase
        .from("leads")
        .select("data")
        .eq("list_id", configureList.id)
        .limit(1)
        .maybeSingle();
      
      if (data?.data) {
        setPreviewLead(data.data as Record<string, string>);
      } else {
        setPreviewLead(null);
      }
    };
    
    fetchPreviewLead();
  }, [configureList?.id, uploadProgress.isUploading]);

  // Fetch users and their list access when users section is selected
  useEffect(() => {
    const fetchUsersWithAccess = async () => {
      if (!configureList || configSection !== "users") return;
      
      setLoadingUsers(true);
      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("status", "active");
        
        if (profilesError) throw profilesError;
        
        // Fetch existing list user access
        const { data: listUsers, error: listUsersError } = await supabase
          .from("list_users")
          .select("user_id")
          .eq("list_id", configureList.id);
        
        if (listUsersError) throw listUsersError;
        
        const accessUserIds = new Set(listUsers?.map(lu => lu.user_id) || []);
        
        // Map profiles with access status
        const usersWithAccess: UserWithAccess[] = (profiles || []).map(p => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          hasAccess: accessUserIds.has(p.id),
        }));
        
        setAllUsers(usersWithAccess);
      } catch (error: any) {
        toast({ title: "Error loading users", description: error.message, variant: "destructive" });
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsersWithAccess();
  }, [configureList?.id, configSection]);

  const handleCreateList = async (
    name: string,
    fields: ListField[],
    description: string,
    data: { headers: string[]; rows: Record<string, string>[] }
  ) => {
    const newList = await createList(name, fields, description);
    if (newList && data.rows.length > 0) {
      await importLeadsFromData(newList.id, data.rows);
    }
    setShowCreateDialog(false);
  };

  const handleConfigureList = (list: List) => {
    setConfigureList(list);
    setEditedFields([...list.fields]);
    setListName(list.name);
    setListSettings(list.settings || {});
    setEmailConfig((list as any).email_config || {});
    setConfigSection("fields");
    
    // Load category settings from list settings
    const settings = list.settings || {};
    setCallbackCategories(settings.callbackCategories || "Call again, Busy");
    setWinnerCategories(settings.winnerCategories || "Sold, Interested");
    setLoserCategories(settings.loserCategories || "Not interested, Wrong number");
    setArchiveCategories(settings.archiveCategories || "");
    setExpandedCategory(null);
  };

  const handleSaveCategories = async () => {
    if (!configureList) return;
    
    const updatedSettings = {
      ...listSettings,
      callbackCategories,
      winnerCategories,
      loserCategories,
      archiveCategories,
    };
    
    const success = await updateList(configureList.id, { settings: updatedSettings });
    if (success) {
      setListSettings(updatedSettings);
      setConfigureList({ ...configureList, settings: updatedSettings });
      toast({ title: "Categories saved successfully" });
    }
  };

  // Template dialog handlers
  const resetTemplateForm = () => {
    setTemplateName("");
    setTemplateSubject("");
    setTemplateBody("");
    setTemplateContent("");
    setEditingEmailTemplate(null);
    setEditingSmsTemplate(null);
    setEditingScript(null);
  };

  const handleEmailTemplateSubmit = async () => {
    if (!configureList || !templateName) return;
    
    if (editingEmailTemplate) {
      await updateEmailTemplate(editingEmailTemplate.id, {
        name: templateName,
        subject: templateSubject,
        body: templateBody,
      });
    } else {
      await createEmailTemplate({
        list_id: configureList.id,
        name: templateName,
        subject: templateSubject,
        body: templateBody,
      });
    }
    
    resetTemplateForm();
    setShowEmailTemplateDialog(false);
  };

  const handleSmsTemplateSubmit = async () => {
    if (!configureList || !templateName) return;
    
    if (editingSmsTemplate) {
      await updateSmsTemplate(editingSmsTemplate.id, {
        name: templateName,
        content: templateContent,
      });
    } else {
      await createSmsTemplate({
        list_id: configureList.id,
        name: templateName,
        content: templateContent,
      });
    }
    
    resetTemplateForm();
    setShowSmsTemplateDialog(false);
  };

  const handleScriptSubmit = async () => {
    if (!configureList || !templateName) return;
    
    if (editingScript) {
      await updateCallScript(editingScript.id, {
        name: templateName,
        content: templateContent,
      });
    } else {
      await createCallScript({
        list_id: configureList.id,
        name: templateName,
        content: templateContent,
      });
    }
    
    resetTemplateForm();
    setShowScriptDialog(false);
  };

  const openEditEmailTemplate = (template: EmailTemplate) => {
    setEditingEmailTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateBody(template.body);
    setShowEmailTemplateDialog(true);
  };

  const openEditSmsTemplate = (template: SmsTemplate) => {
    setEditingSmsTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setShowSmsTemplateDialog(true);
  };

  const openEditScript = (script: CallScript) => {
    setEditingScript(script);
    setTemplateName(script.name);
    setTemplateContent(script.content);
    setShowScriptDialog(true);
  };

  const handleSaveEmailConfig = async () => {
    if (!configureList) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("lists")
      .update({ email_config: emailConfig as any })
      .eq("id", configureList.id);
    
    if (error) {
      toast({ title: "Error saving email config", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ title: "Email configuration saved" });
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

  const handleImportLeads = async (data: { headers: string[]; rows: Record<string, string>[] }) => {
    if (!configureList) return;
    await importLeadsFromData(configureList.id, data.rows);
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
                      title="Import leads"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => handleConfigureList(list)}
                      title="Configure list"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-background border shadow-md z-50">
                        <DropdownMenuItem className="cursor-pointer">
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Call the next lead in queue
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <ListOrdered className="h-4 w-4 mr-2" />
                          View queue
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Eye className="h-4 w-4 mr-2" />
                          View all leads
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add new, empty lead to list
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleConfigureList(list)}>
                          <Settings2 className="h-4 w-4 mr-2" />
                          Configure list
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => {
                          handleConfigureList(list);
                          setShowImportDialog(true);
                        }}>
                          <Upload className="h-4 w-4 mr-2" />
                          Import into list
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        const allChecked = allUsers.length > 0 && allUsers.every(u => u.hasAccess);
        const someChecked = allUsers.some(u => u.hasAccess);
        
        const handleCheckAll = (checked: boolean) => {
          setAllUsers(allUsers.map(u => ({ ...u, hasAccess: checked })));
        };
        
        const handleUserToggle = (userId: string, checked: boolean) => {
          setAllUsers(allUsers.map(u => 
            u.id === userId ? { ...u, hasAccess: checked } : u
          ));
        };
        
        const handleSaveUsers = async () => {
          if (!configureList) return;
          setSavingUsers(true);
          
          try {
            // Delete existing access
            await supabase
              .from("list_users")
              .delete()
              .eq("list_id", configureList.id);
            
            // Insert new access
            const usersWithAccess = allUsers.filter(u => u.hasAccess);
            if (usersWithAccess.length > 0) {
              const { error } = await supabase
                .from("list_users")
                .insert(usersWithAccess.map(u => ({
                  list_id: configureList.id,
                  user_id: u.id,
                })));
              
              if (error) throw error;
            }
            
            toast({ title: "User access saved successfully" });
          } catch (error: any) {
            toast({ title: "Error saving user access", description: error.message, variant: "destructive" });
          } finally {
            setSavingUsers(false);
          }
        };
        
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              Select which users have access to this list
            </div>

            {loadingUsers ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pl-20">
                  <Checkbox 
                    id="check-all" 
                    checked={allChecked}
                    onCheckedChange={(checked) => handleCheckAll(!!checked)}
                  />
                  <Label htmlFor="check-all" className="font-medium">
                    {allChecked ? "Uncheck All" : "Check All"}
                  </Label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-4">
                    <Label className="w-16 text-right font-medium pt-1">Users</Label>
                    <div className="space-y-2">
                      {allUsers.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No users found</p>
                      ) : (
                        allUsers.map((user) => (
                          <div key={user.id} className="flex items-center gap-3">
                            <Checkbox 
                              id={user.id} 
                              checked={user.hasAccess}
                              onCheckedChange={(checked) => handleUserToggle(user.id, !!checked)}
                            />
                            <Label htmlFor={user.id}>
                              {user.full_name || user.email}
                              {user.full_name && (
                                <span className="text-muted-foreground ml-2 text-sm">({user.email})</span>
                              )}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="pl-20">
                  <Button 
                    onClick={handleSaveUsers} 
                    disabled={savingUsers}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {savingUsers && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            )}
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
        const parseCategories = (value: string) => 
          value.split(',').map(c => c.trim()).filter(c => c.length > 0);
        
        const renderCategoryButton = (
          id: string, 
          label: string, 
          icon: React.ReactNode, 
          bgColor: string, 
          categories: string[]
        ) => (
          <div className="relative">
            <Button 
              className={`w-full ${bgColor} justify-between`}
              onClick={() => setExpandedCategory(expandedCategory === id ? null : id)}
            >
              <span className="flex items-center gap-2">
                {icon}
                {label}
              </span>
              {categories.length > 0 && (
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedCategory === id ? 'rotate-180' : ''}`} />
              )}
            </Button>
            {expandedCategory === id && categories.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg z-50">
                {categories.map((cat, idx) => (
                  <button 
                    key={idx} 
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t last:rounded-b"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

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
                  <Input 
                    value={callbackCategories} 
                    onChange={(e) => setCallbackCategories(e.target.value)}
                    className="flex-1" 
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Winner categories</Label>
                  <Input 
                    value={winnerCategories} 
                    onChange={(e) => setWinnerCategories(e.target.value)}
                    className="flex-1" 
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Loser categories</Label>
                  <Input 
                    value={loserCategories} 
                    onChange={(e) => setLoserCategories(e.target.value)}
                    className="flex-1" 
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Archive categories</Label>
                  <Input 
                    value={archiveCategories} 
                    onChange={(e) => setArchiveCategories(e.target.value)}
                    className="flex-1" 
                  />
                </div>

                <div className="pl-44">
                  <Button onClick={handleSaveCategories} className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>

            <div className="w-48">
              <h3 className="text-lg font-medium mb-4">Preview</h3>
              <div className="space-y-3">
                {renderCategoryButton(
                  'callback',
                  'Call back',
                  <RefreshCw className="h-4 w-4" />,
                  'bg-teal-500 hover:bg-teal-600',
                  parseCategories(callbackCategories)
                )}
                {renderCategoryButton(
                  'winner',
                  'Winner',
                  <ThumbsUp className="h-4 w-4" />,
                  'bg-green-500 hover:bg-green-600',
                  parseCategories(winnerCategories)
                )}
                {renderCategoryButton(
                  'loser',
                  'Loser',
                  <ThumbsDown className="h-4 w-4" />,
                  'bg-red-500 hover:bg-red-600',
                  parseCategories(loserCategories)
                )}
                {renderCategoryButton(
                  'archive',
                  'Archive',
                  <Archive className="h-4 w-4" />,
                  'bg-slate-500 hover:bg-slate-600',
                  parseCategories(archiveCategories)
                )}
              </div>
            </div>
          </div>
        );

      case "scripts":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Call scripts help agents follow a consistent conversation flow when calling leads.</p>
            </div>

            <Button 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                resetTemplateForm();
                setShowScriptDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Script
            </Button>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Content</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {callScripts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        No call scripts configured yet.
                      </td>
                    </tr>
                  ) : (
                    callScripts.map((script) => (
                      <tr key={script.id} className="border-t border-border">
                        <td className="p-3 text-primary">{script.name}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-xs">{script.content}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => openEditScript(script)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => deleteCallScript(script.id)}
                            >
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

            <div className="border border-border rounded-lg p-4">
              <h3 className="font-medium mb-2">Available merge tags</h3>
              <p className="text-sm text-muted-foreground mb-4">Copy merge tags to use in your scripts.</p>
              
              <div className="flex flex-wrap gap-2">
                {editedFields.map((field) => (
                  <code key={field.id} className="bg-muted px-2 py-1 rounded text-xs">
                    {"{{ " + field.name.toLowerCase().replace(/\s+/g, "_") + " }}"}
                  </code>
                ))}
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
        // Show full-page editor when creating or editing a template
        if (showEmailTemplateDialog || editingEmailTemplate) {
          return (
            <EmailTemplateEditor
              templateName={templateName}
              templateSubject={templateSubject}
              templateBody={templateBody}
              onNameChange={setTemplateName}
              onSubjectChange={setTemplateSubject}
              onBodyChange={setTemplateBody}
              fields={editedFields}
              onSave={handleEmailTemplateSubmit}
              onCancel={() => {
                resetTemplateForm();
                setShowEmailTemplateDialog(false);
              }}
              isEditing={!!editingEmailTemplate}
              previewData={previewLead}
            />
          );
        }

        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Configure email settings and templates for this list. Each list can have its own SMTP configuration.</p>
            </div>

            {/* Email Configuration */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Email Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={emailConfig.from_name || ""}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from_name: e.target.value })}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={emailConfig.from_email || ""}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from_email: e.target.value })}
                    placeholder="noreply@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={emailConfig.smtp_host || ""}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    type="number"
                    value={emailConfig.smtp_port || 587}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) })}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input
                    value={emailConfig.smtp_username || ""}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value })}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input
                    type="password"
                    value={emailConfig.smtp_password || ""}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-tls"
                  checked={emailConfig.use_tls ?? true}
                  onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, use_tls: !!checked })}
                />
                <Label htmlFor="use-tls">Use TLS</Label>
              </div>
              
              <Button onClick={handleSaveEmailConfig} className="bg-destructive hover:bg-destructive/90">
                Save Email Configuration
              </Button>
            </div>

            {/* Email Templates */}
            <div className="space-y-4">
              <h3 className="font-medium">Email Templates</h3>
              
              <Button 
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  resetTemplateForm();
                  setShowEmailTemplateDialog(true);
                }}
              >
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
                    {emailTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">
                          No email templates configured yet.
                        </td>
                      </tr>
                    ) : (
                      emailTemplates.map((template) => (
                        <tr key={template.id} className="border-t border-border">
                          <td className="p-3 text-primary">{template.name}</td>
                          <td className="p-3">{template.subject}</td>
                          <td className="p-3 text-muted-foreground truncate max-w-xs">
                            <div 
                              className="truncate"
                              dangerouslySetInnerHTML={{ __html: template.body.replace(/<[^>]*>/g, ' ').slice(0, 80) + '...' }}
                            />
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                title="Preview"
                                onClick={() => setPreviewingEmailTemplate(template)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                title="Edit"
                                onClick={() => openEditEmailTemplate(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                title="Delete"
                                onClick={() => deleteEmailTemplate(template.id)}
                              >
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

              {/* Email Preview Dialog */}
              <Dialog open={!!previewingEmailTemplate} onOpenChange={(open) => !open && setPreviewingEmailTemplate(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Email Preview: {previewingEmailTemplate?.name}</DialogTitle>
                    <DialogDescription>
                      Preview of how the email will appear to recipients
                    </DialogDescription>
                  </DialogHeader>
                  {previewingEmailTemplate && (
                    <div className="border border-border rounded bg-white">
                      {/* Email client simulation header */}
                      <div className="bg-muted/50 border-b border-border p-3 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-muted-foreground w-16">From:</span>
                          <span>{emailConfig.from_name || 'Your Company'} &lt;{emailConfig.from_email || 'noreply@example.com'}&gt;</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-muted-foreground w-16">To:</span>
                          <span>{previewLead ? Object.values(previewLead).find(v => v?.includes?.('@')) || 'recipient@example.com' : 'recipient@example.com'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-muted-foreground w-16">Subject:</span>
                          <span className="font-medium">{previewingEmailTemplate.subject || "(no subject)"}</span>
                        </div>
                      </div>
                      {/* Email body preview */}
                      <div 
                        className="prose prose-sm max-w-none p-4 min-h-[200px]"
                        dangerouslySetInnerHTML={{ 
                          __html: previewingEmailTemplate.body || "<p class='text-muted-foreground italic'>(no content)</p>" 
                        }}
                      />
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPreviewingEmailTemplate(null)}>
                      Close
                    </Button>
                    <Button onClick={() => {
                      openEditEmailTemplate(previewingEmailTemplate!);
                      setPreviewingEmailTemplate(null);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        );

      case "texts":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Text templates are pre-written messages that let you merge in lead information automatically.</p>
            </div>

            <Button 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                resetTemplateForm();
                setShowSmsTemplateDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Content</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {smsTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        No text templates configured yet.
                      </td>
                    </tr>
                  ) : (
                    smsTemplates.map((template) => (
                      <tr key={template.id} className="border-t border-border">
                        <td className="p-3 text-primary">{template.name}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-xs">{template.content}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => openEditSmsTemplate(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => deleteSmsTemplate(template.id)}
                            >
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

            <div className="border border-border rounded-lg p-4">
              <h3 className="font-medium mb-2">Available merge tags</h3>
              <div className="flex flex-wrap gap-2">
                {editedFields.map((field) => (
                  <code key={field.id} className="bg-muted px-2 py-1 rounded text-xs">
                    {"{{ " + field.name.toLowerCase().replace(/\s+/g, "_") + " }}"}
                  </code>
                ))}
              </div>
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

              {configSection === "fields" && (
                <div className="w-96">
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 text-sm">
                      <span className="font-medium">Lead Preview</span>
                      <span className="text-muted-foreground ml-1">— how leads appear to agents:</span>
                    </div>
                    
                    {previewLead ? (
                      <div className="divide-y divide-border">
                        {/* Header with status and company name */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="bg-blue-500 text-white text-xs px-2.5 py-1 rounded font-medium">New</span>
                            <h3 className="text-lg font-semibold text-foreground">
                              {previewLead[editedFields[0]?.name] || "Lead"}
                            </h3>
                            <Linkedin className="h-4 w-4 text-[#0077b5]" />
                          </div>
                          
                          {/* Phone numbers */}
                          <div className="space-y-1">
                            {editedFields
                              .filter(f => f.type === "Phone")
                              .map((field) => {
                                const phoneValue = previewLead[field.name];
                                if (!phoneValue) return null;
                                return (
                                  <div key={field.id} className="flex items-center gap-2">
                                    <a href={`tel:${phoneValue}`} className="text-primary hover:underline font-medium">
                                      {phoneValue}
                                    </a>
                                    <button className="text-muted-foreground hover:text-foreground">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                        
                        {/* Lead data fields */}
                        <div className="p-4">
                          <div className="space-y-2.5 text-sm">
                            {editedFields
                              .filter(f => f.type !== "Phone")
                              .slice(0, 8)
                              .map((field) => {
                                const value = previewLead[field.name];
                                const isEmail = field.type === "E-mail";
                                const isUrl = field.type === "www";
                                
                                return (
                                  <div key={field.id} className="grid grid-cols-[120px_1fr] gap-x-3">
                                    <span className="text-right font-medium text-muted-foreground">{field.name}</span>
                                    {isEmail && value ? (
                                      <a href={`mailto:${value}`} className="text-primary hover:underline truncate">
                                        {value}
                                      </a>
                                    ) : isUrl && value ? (
                                      <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                        {value}
                                      </a>
                                    ) : (
                                      <span className="text-foreground truncate">{value || "—"}</span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                        
                        {/* Metadata */}
                        <div className="p-4 bg-muted/30">
                          <div className="space-y-1.5 text-xs">
                            <div className="grid grid-cols-[120px_1fr] gap-x-3">
                              <span className="text-right font-medium text-muted-foreground">Current List</span>
                              <span className="text-primary">{configureList.name} →</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-x-3">
                              <span className="text-right font-medium text-muted-foreground">Claimed by</span>
                              <span className="text-foreground">Not claimed - <span className="text-primary cursor-pointer hover:underline">Claim now</span></span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-2 border-b border-border pb-3">
                            <button className="flex items-center gap-1.5 text-primary font-medium text-sm">
                              <Phone className="h-4 w-4" />
                              Call
                            </button>
                            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm ml-4">
                              <Mail className="h-4 w-4" />
                              E-mail
                            </button>
                            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm ml-4">
                              <MessageSquare className="h-4 w-4" />
                              SMS
                            </button>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Call back
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Winner
                            </Button>
                            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white flex-1 text-xs">
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              Loser
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <p className="text-sm">No leads in this list yet.</p>
                        <p className="text-xs mt-1">Import leads to see a preview.</p>
                        <Button 
                          className="bg-destructive hover:bg-destructive/90 mt-4"
                          onClick={() => setShowImportDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add leads
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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

        {/* SMS Template Dialog */}
        <Dialog open={showSmsTemplateDialog} onOpenChange={setShowSmsTemplateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSmsTemplate ? "Edit SMS Template" : "New SMS Template"}</DialogTitle>
              <DialogDescription>
                Create an SMS template for this list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Appointment Reminder"
                />
              </div>
              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="Write your SMS message here..."
                  className="min-h-[120px]"
                />
              </div>
              <div className="border border-border rounded-lg p-3 bg-muted/30">
                <p className="text-sm font-medium mb-2">Available merge tags:</p>
                <div className="flex flex-wrap gap-2">
                  {editedFields.map((field) => (
                    <code key={field.id} className="bg-background px-2 py-1 rounded text-xs border">
                      {"{{" + field.name.toLowerCase().replace(/\s+/g, "_") + "}}"}
                    </code>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSmsTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSmsTemplateSubmit} disabled={!templateName}>
                {editingSmsTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Call Script Dialog */}
        <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingScript ? "Edit Call Script" : "New Call Script"}</DialogTitle>
              <DialogDescription>
                Create a call script to guide agents during calls.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Script Name</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Initial Call Script"
                />
              </div>
              <div className="space-y-2">
                <Label>Script Content</Label>
                <Textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="Write your call script here..."
                  className="min-h-[300px]"
                />
              </div>
              <div className="border border-border rounded-lg p-3 bg-muted/30">
                <p className="text-sm font-medium mb-2">Available merge tags:</p>
                <div className="flex flex-wrap gap-2">
                  {editedFields.map((field) => (
                    <code key={field.id} className="bg-background px-2 py-1 rounded text-xs border">
                      {"{{" + field.name.toLowerCase().replace(/\s+/g, "_") + "}}"}
                    </code>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScriptDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleScriptSubmit} disabled={!templateName}>
                {editingScript ? "Save Changes" : "Create Script"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  return (
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
  );
}
