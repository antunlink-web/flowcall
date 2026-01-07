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
  GripVertical,
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
  List,
  ListOrdered as ListOrderedIcon,
  Undo,
  Redo,
  Paperclip,
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

const mockUsers = [
  { id: "1", name: "Antun Palić", checked: true },
  { id: "2", name: "BRIGITA PONOMAR", checked: true },
  { id: "3", name: "KAMILĖ GUSTAITĖ", checked: true },
  { id: "4", name: "MIGLĖ PETKEVIČIŪTĖ", checked: true },
];

const mockQueueLeads = [
  { company: "Prisipūsk šypseną, MB", phone1: "+370 650 63337", phone2: "", remark: "Call back about 6 hours ago" },
  { company: "Pajūrio kopa, UAB", phone1: "+370 684 70919", phone2: "", remark: "Call back about 6 hours ago" },
  { company: "Contare, MB", phone1: "+370 613 78613", phone2: "", remark: "Call back in 5 minutes" },
  { company: "Madagis, UAB", phone1: "+370 652 37679", phone2: "", remark: "Call back about 6 hours ago" },
  { company: "Bee LT, UAB", phone1: "+370 698 20436", phone2: "", remark: "Call back about 6 hours ago" },
];

const mockEmailTemplates = [
  { id: "1", name: "EN PASIT. VAIKAMS", subject: "Inquiry regarding donation", body: "Hello, dear {{ vadovas | default: \"\" }}, Some time ago, ..." },
  { id: "2", name: "LAIŠKAS KALĖDOMS", subject: "Jūsų gera valia keičia vaikų gyvenimus!", body: "Gerb. {{ vadovas | default: \"\" }}, Įsivaizduokite lauke..." },
  { id: "3", name: "Pasiteir. vaikams", subject: "Pasiteiravimas dėl paramos vaikams iš nepasiturinčių šeimų", body: "Laba diena, gerb. {{ vadovas | default: \"\" }}, Prieš kurį..." },
];

const mockMergeTags = [
  { field: "Įmonė", tag: "{{ imone | default: \"\" }}" },
  { field: "Telefonas (1)", tag: "{{ telefonas_1 | default: \"\" }}" },
  { field: "Telefonas (2)", tag: "{{ telefonas_2 | default: \"\" }}" },
  { field: "Telefonas (3)", tag: "{{ telefonas_3 | default: \"\" }}" },
  { field: "EMAIL", tag: "{{ email | default: \"\" }}" },
  { field: "MOKETOJO KODAS", tag: "{{ moketojo_kodas | default: \"\" }}" },
  { field: "Rekvizitai URL", tag: "{{ rekvizitai_url | default: \"\" }}" },
  { field: "Svetainė", tag: "{{ svetaine | default: \"\" }}" },
  { field: "Vadovas", tag: "{{ vadovas | default: \"\" }}" },
  { field: "REMARK", tag: "{{ remark | default: \"\" }}" },
  { field: "DATE", tag: "{{ date | default: \"\" }}" },
  { field: "Agent First name", tag: "{{ agent_first_name | default: \"\" }}" },
  { field: "Agent Last name", tag: "{{ agent_last_name | default: \"\" }}" },
  { field: "Agent Full name", tag: "{{ agent_full_name | default: \"\" }}" },
  { field: "Agent Email", tag: "{{ agent_email | default: \"\" }}" },
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
                  <Input defaultValue="PAGALBA VAIKAMS" className="max-w-md" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-4">
                    <Label className="w-24 text-right pt-2">Prepend phone</Label>
                    <div className="space-y-2">
                      <Input defaultValue="+1" className="max-w-md" />
                      <p className="text-sm text-primary">
                        Prepend all phone numbers with this by default <strong>unless</strong> the number already starts with "+" or the same value as provided here.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Useful if you don't have country code prepended in your lead data.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pl-28">
                  <div className="flex items-start gap-3">
                    <Checkbox id="inline-identifiers" />
                    <div>
                      <Label htmlFor="inline-identifiers">Inline identifiers</Label>
                      <p className="text-sm text-muted-foreground">Show the first two fields on one line</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox id="lock-defaults" />
                    <div>
                      <Label htmlFor="lock-defaults">Lock on defaults</Label>
                      <p className="text-sm text-muted-foreground">Do not allow changes to our standard fields. Required for certain integrations to be available</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox id="internal-colleagues" />
                    <div>
                      <Label htmlFor="internal-colleagues">Internal colleagues only</Label>
                      <p className="text-sm text-primary">Only show colleagues from within this list. PLEASE NOTE this feature is not available on your current plan.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox id="blocklist" />
                    <div>
                      <Label htmlFor="blocklist">Blocklist</Label>
                      <p className="text-sm text-primary">Use this list as a no-call/blocklist list when deduplicating.</p>
                    </div>
                  </div>

                  <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-foreground mb-4">Email Settings</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Label className="w-24 text-right pt-2">CC Email</Label>
                  <div className="space-y-2">
                    <Input className="max-w-md" />
                    <p className="text-sm text-muted-foreground">
                      If provided this email address will be CC on every email sent to leads on this list.
                    </p>
                  </div>
                </div>
                <div className="pl-28">
                  <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
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
                <p>If you are looking to change how your follow-ups are prioritised, you should look at the queue algorithm in the account workflow settings.</p>
                <p><strong>Please note:</strong> Users can also add filters to their queue and control sorting of unscheduled leads and that might be a preferred approach. The user queue settings are individual to each user.</p>
                <p className="font-medium">Be careful with turning on prioritization of new leads as long as your list has many new leads:</p>
                <p className="text-primary">Prioritising new leads will surpress call backs and due leads until there are no more new leads in the list, and could prevent hot leads from being followed up in a timely manner.</p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Priority</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="prioritise-postponed" />
                    <div>
                      <Label htmlFor="prioritise-postponed">Prioritise New leads over postponed leads</Label>
                      <p className="text-sm text-muted-foreground">Always put new leads before call backs in the queue. Useful if new leads are being added as they are captured and should be called right away.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox id="prioritise-scheduled" />
                    <div>
                      <Label htmlFor="prioritise-scheduled">Prioritise New leads over scheduled leads</Label>
                      <p className="text-sm text-muted-foreground">Always put new leads before due and overdue leads in the queue. Like above, but for when new leads are even more important than scheduled ones.</p>
                    </div>
                  </div>

                  <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Unlock Calling Hours</h3>
                <p className="text-sm text-muted-foreground mb-4">Set your preferred calling window; we'll enqueue leads whose local time fits, based on their phone data. When a time zone can't be found, the lead is safely queued as usual.</p>
                <Button className="bg-destructive hover:bg-destructive/90">Upgrade your subscription now</Button>
              </div>
            </div>

            <div className="w-96">
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3">
                  <span className="text-lg font-light text-primary italic">Queue preview</span>
                  <span className="text-sm text-muted-foreground ml-2">remember to save when it looks good</span>
                </div>
                <div className="p-4">
                  <div className="bg-muted/30 p-3 rounded mb-4 text-sm">
                    <p className="font-medium mb-2">Leads included in the queue preview (only for this preview - not saved):</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <Checkbox defaultChecked />
                        <span>New (110147)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox defaultChecked />
                        <span>Call back (5652)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox defaultChecked />
                        <span>Scheduled (95)</span>
                      </label>
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Įmonė</th>
                        <th className="text-left py-2">Telefonas (1)</th>
                        <th className="text-left py-2">Telefonas (2)</th>
                        <th className="text-left py-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockQueueLeads.map((lead, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 text-primary">{lead.company}</td>
                          <td className="py-2 text-primary">{lead.phone1}</td>
                          <td className="py-2 text-primary">{lead.phone2}</td>
                          <td className="py-2">
                            <span className="bg-destructive text-white text-xs px-2 py-0.5 rounded">{lead.remark}</span>
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

      case "dedupe":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm space-y-3">
              <p>By default, duplicates are matched by phone numbers and email addresses.</p>
              <p>Here you can changet the default behaviour. Let's say you have an additional identifying field, such as 'Full Name', 'ID' or similar. Then you can choose this field in the dropdown for myphoner to start looking for duplicates that match on that field as well.</p>
              <p className="text-primary">When you change these settings the detection need to run before it takes effect. This can take some time, depending on the size of your list. Usually the detection takes about 5-10 minutes.</p>
              <p><strong>Tip:</strong> Only want to match on mobile phone, not company phone? Simply untick 'Duplicates match on phone' and choose 'Mobile Phone' in the 'Match on'-dropdown.</p>
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

              <div className="flex items-center gap-4">
                <Label className="w-20 text-right">Match on</Label>
                <Select defaultValue="MOKETOJO KODAS">
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="MOKETOJO KODAS">MOKETOJO KODAS</SelectItem>
                    <SelectItem value="EMAIL">EMAIL</SelectItem>
                    <SelectItem value="Vadovas">Vadovas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground pl-24">Choose a custom field to use when detecting duplicates</p>

              <div className="flex items-start gap-3">
                <Checkbox id="internal-detection" />
                <div>
                  <Label htmlFor="internal-detection" className="font-medium">Internal detection only</Label>
                  <p className="text-sm text-primary">Limit duplicate detection to this list only. PLEASE NOTE this feature is not available on your current plan.</p>
                </div>
              </div>

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
            <p className="text-muted-foreground">Expiration settings are available on higher tier plans.</p>
            <Button className="bg-primary hover:bg-primary/90">Upgrade to access</Button>
          </div>
        );

      case "categories":
        return (
          <div className="flex gap-8">
            <div className="flex-1 space-y-6">
              <div className="bg-muted/50 border border-border rounded p-4 text-sm space-y-2">
                <p>Add custom categories to each state, so that agents can (optionally) choose a category for the appropriate action when finishing a call.</p>
                <p>The categories can later be analysed in the reports section of myphoner.</p>
                <p><strong>Please Note</strong> that categories are stored as simple text strings, and if you make a spelling mistake and later change the name of the category, any leads tagged with the old category will remain tagged with the misspelled version, so be careful with renaming categories in the middle of a campaign.</p>
              </div>

              <div className="bg-blue-100 border border-blue-300 rounded p-3 flex items-center gap-2 text-sm text-blue-800">
                <Info className="h-4 w-4" />
                <span>Separate categories by comma (,)</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Call back categories</Label>
                  <Input defaultValue="Rna, Call again, Call again sent, Call again sold" className="flex-1" />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Winner categories</Label>
                  <Input defaultValue="Send offer, Sold signed, Sold" className="flex-1" />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Loser categories</Label>
                  <Input defaultValue="Not interested, Wrong number" className="flex-1" />
                </div>

                <div className="flex items-center gap-4">
                  <Label className="w-40 text-right">Archive categories</Label>
                  <Input className="flex-1" />
                </div>

                <div className="flex items-start gap-3 pl-44">
                  <Checkbox id="force-category" />
                  <div>
                    <Label htmlFor="force-category">Force category disposition</Label>
                    <p className="text-sm text-primary">Do not allow dispositioning with the main state alone if categories are present.</p>
                  </div>
                </div>

                <div className="pl-44">
                  <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>

            <div className="w-48">
              <h3 className="text-lg font-medium mb-4">Preview</h3>
              <div className="w-px h-0.5 bg-primary mb-4" />
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
              {/* Toolbar */}
              <div className="border border-border rounded-t flex items-center gap-1 p-2 bg-muted/30">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Strikethrough className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><LinkIcon className="h-4 w-4" /></Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8"><Quote className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Code className="h-4 w-4" /></Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8"><List className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><ListOrderedIcon className="h-4 w-4" /></Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8"><Paperclip className="h-4 w-4" /></Button>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8"><Undo className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Redo className="h-4 w-4" /></Button>
              </div>
              
              <Textarea className="min-h-[200px] rounded-t-none -mt-4" placeholder="Enter your call script here..." />

              <div className="space-y-2">
                <Label>Insert merge tag</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field name to insert as merge tag in the template" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {mockFields.map((field) => (
                      <SelectItem key={field.id} value={field.name}>{field.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-destructive hover:bg-destructive/90">Save</Button>

              <div className="border border-border rounded p-4 mt-4">
                <h3 className="font-medium mb-2">Preview</h3>
                <p className="text-sm text-muted-foreground">Refresh page to see a different sample</p>
              </div>
            </div>

            <div className="w-80">
              <div className="border border-border rounded-lg">
                <div className="p-4">
                  <h3 className="font-medium mb-2">Available merge tags</h3>
                  <p className="text-sm text-muted-foreground mb-4">Copy from here to both subject and body, or insert directly to the body text by selecting a field from the 'Insert merge tag'-dropdown above.</p>
                  
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Field Name</th>
                        <th className="text-left py-2 font-medium">Merge Tag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockMergeTags.map((tag, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{tag.field}</td>
                          <td className="py-2">
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">{tag.tag}</code>
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
              <p>Email templates are pre-written emails that let you merge in lead information automatically. Once you have defined a set of templates, they are accessible from the lead view when working your queue.</p>
            </div>

            <Button className="bg-destructive hover:bg-destructive/90">
              <Plus className="h-4 w-4 mr-2" />
              New Template
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Show</span>
                <Select defaultValue="25">
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm">entries</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Search:</span>
                <Input className="w-48" />
              </div>
            </div>

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
                  {mockEmailTemplates.map((template) => (
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
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Showing 1 to {mockEmailTemplates.length} of {mockEmailTemplates.length} entries</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm">Previous</Button>
                <Button size="sm" className="bg-destructive hover:bg-destructive/90">1</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </div>
          </div>
        );

      case "texts":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 border border-border rounded p-4 text-sm">
              <p>Text templates are pre-written messages that let you merge in lead information automatically. Once you have defined a set of templates, they are accessible from the lead view when working your queue.</p>
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
            {/* Archive Section */}
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
                  <p>An archived list can be fully restored if neccesary.</p>
                </div>
                <Button className="bg-destructive hover:bg-destructive/90 shrink-0">Archive List</Button>
              </div>
            </div>

            {/* Delete Section */}
            <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-red-200">
                <h3 className="text-red-800 font-medium">Permanently delete this list</h3>
              </div>
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-2 text-sm">
                  <p className="text-red-600">If you delete PAGALBA VAIKAMS, all its leads and their data will be permanently lost.</p>
                  <p>This includes event data used to show historical reports. Please note that event data remains with a list, even if a lead is moved/migrated aways from that list.</p>
                  <p>You should only delete a list that have never had any real activity on it. We strongly recommend archiving lists that have had any activity instead of deleting them. This way your reports can still show historical stats about them.</p>
                  <p className="font-medium">You cannot undo this action. Deleted lists cannot be restored.</p>
                </div>
                <Button variant="destructive" className="shrink-0">Delete List</Button>
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