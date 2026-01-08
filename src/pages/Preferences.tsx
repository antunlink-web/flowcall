import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { 
  User, 
  Key, 
  Mail, 
  MessageSquare, 
  Phone, 
  Settings2, 
  Filter, 
  Bell, 
  Inbox,
  ChevronRight,
  Upload
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const sidebarItems = [
  { id: "profile", label: "Profile information", icon: User },
  { id: "credentials", label: "Credentials", icon: Key },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "texting", label: "Texting", icon: MessageSquare },
  { id: "dialling", label: "Dialling", icon: Phone },
  { id: "working", label: "Working", icon: Settings2 },
  { id: "queue", label: "Queue", icon: Filter },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "email-dropbox", label: "Email Dropbox", icon: Inbox },
];

export default function Preferences() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState(user?.user_metadata?.full_name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "");
  const [email] = useState(user?.email || "");

  // Notifications state
  const [notifyScheduledLeads, setNotifyScheduledLeads] = useState(false);
  const [notifyLeadDue, setNotifyLeadDue] = useState(false);
  const [notifyLeadOverdue, setNotifyLeadOverdue] = useState(false);
  const [notifyDropboxErrors, setNotifyDropboxErrors] = useState(false);
  const [notifyInvoices, setNotifyInvoices] = useState(true);
  const [notifyBalance, setNotifyBalance] = useState(true);

  // Dialling state
  const [dialler, setDialler] = useState("default");

  // Working state
  const [alwaysShowTimer, setAlwaysShowTimer] = useState(true);
  const [viewLeadsOnly, setViewLeadsOnly] = useState(false);
  const [includeUnclaimed, setIncludeUnclaimed] = useState(false);
  const [hotkeys, setHotkeys] = useState(false);

  // Fetch avatar on mount
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File cannot be larger than 2 megabytes");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl + "?t=" + Date.now());
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      toast.error("Error uploading avatar: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved");
  };

  const handleSaveDialling = () => {
    toast.success("Dialling settings saved");
  };

  const handleSaveWorking = () => {
    toast.success("Working preferences saved");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Basic info</h3>
              <Separator className="mb-6" />
              <div className="grid gap-4 max-w-lg">
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label htmlFor="firstName" className="text-right">First name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label htmlFor="lastName" className="text-right">Last name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    <span className="text-destructive">*</span> Email
                  </Label>
                  <Input id="email" value={email} disabled />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-start gap-4">
                  <Label className="text-right pt-2">Avatar</Label>
                  <div>
                    <Avatar className="w-16 h-16 rounded-none mb-2">
                      <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                      <AvatarFallback className="rounded-none bg-muted">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? "Uploading..." : "Select image"}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-1">
                      File cannot be larger than 2 megabytes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">General profile settings</h3>
              <Separator className="mb-6" />
              <div className="grid gap-4 max-w-lg">
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label className="text-right">Timezone</Label>
                  <Select defaultValue="europe-vilnius">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="europe-vilnius">(GMT+02:00) Europe/Vilnius</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="america-new-york">(GMT-05:00) America/New_York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label className="text-right">Week starts on</Label>
                  <Select defaultValue="monday">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label className="text-right">Time display</Label>
                  <Select defaultValue="24h">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">24 hour clock</SelectItem>
                      <SelectItem value="12h">12 hour clock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <Label className="text-right">Date display</Label>
                  <Select defaultValue="dmy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dmy">day-month-year (dd-mm-yyyy)</SelectItem>
                      <SelectItem value="mdy">month-day-year (mm-dd-yyyy)</SelectItem>
                      <SelectItem value="ymd">year-month-day (yyyy-mm-dd)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="bg-[hsl(200,50%,45%)] hover:bg-[hsl(200,50%,40%)]">
              Save
            </Button>
          </div>
        );

      case "credentials":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Change password</h3>
              <Separator className="mb-6" />
              <div className="grid gap-4 max-w-lg">
                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                  <Label className="text-right">Current password</Label>
                  <Input type="password" />
                </div>
                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                  <Label className="text-right">New password</Label>
                  <Input type="password" />
                </div>
                <p className="text-sm text-muted-foreground ml-[166px]">
                  must have at least 12 characters, one lower-case letter, one upper-case letter and one number
                </p>
                <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                  <Label className="text-right">Repeat new password</Label>
                  <Input type="password" />
                </div>
              </div>
              <Button className="mt-4 bg-[hsl(200,50%,45%)] hover:bg-[hsl(200,50%,40%)]">
                Change Password
              </Button>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">User Notifications</h3>
              <Separator className="mb-6" />
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="scheduledLeads" 
                    checked={notifyScheduledLeads}
                    onCheckedChange={(checked) => setNotifyScheduledLeads(checked as boolean)}
                  />
                  <Label htmlFor="scheduledLeads" className="cursor-pointer">
                    Send an email with my scheduled leads every morning.
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="leadDue" 
                    checked={notifyLeadDue}
                    onCheckedChange={(checked) => setNotifyLeadDue(checked as boolean)}
                  />
                  <div>
                    <Label htmlFor="leadDue" className="cursor-pointer">
                      Send an email when a lead is due.
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Will send the email about 2 minutes after the lead becomes due, but only if you are not already looking at the lead.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="leadOverdue" 
                    checked={notifyLeadOverdue}
                    onCheckedChange={(checked) => setNotifyLeadOverdue(checked as boolean)}
                  />
                  <div>
                    <Label htmlFor="leadOverdue" className="cursor-pointer">
                      Send an email when a lead becomes overdue.
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Leads become overdue 1 day after they are due.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="dropboxErrors" 
                    checked={notifyDropboxErrors}
                    onCheckedChange={(checked) => setNotifyDropboxErrors(checked as boolean)}
                  />
                  <Label htmlFor="dropboxErrors" className="cursor-pointer">
                    Send an email if there are errors processing your dropbox emails.
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Admin Notifications</h3>
              <Separator className="mb-6" />
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="invoices" 
                    checked={notifyInvoices}
                    onCheckedChange={(checked) => setNotifyInvoices(checked as boolean)}
                  />
                  <Label htmlFor="invoices" className="cursor-pointer">
                    Send a copy of invoices to my email.
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="balance" 
                    checked={notifyBalance}
                    onCheckedChange={(checked) => setNotifyBalance(checked as boolean)}
                  />
                  <Label htmlFor="balance" className="cursor-pointer">
                    Send an email when we use your balance to pay for subscriptions (e.g. phone numbers or add-ons).
                  </Label>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveNotifications} className="bg-[hsl(200,50%,45%)] hover:bg-[hsl(200,50%,40%)]">
              Update
            </Button>
          </div>
        );

      case "dialling":
        return (
          <div className="space-y-8">
            <div className="grid gap-4 max-w-lg">
              <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                <Label className="text-right">Dialler</Label>
                <Select value={dialler} onValueChange={setDialler}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default softphone</SelectItem>
                    <SelectItem value="skype">Skype</SelectItem>
                    <SelectItem value="zoiper">Zoiper</SelectItem>
                    <SelectItem value="tel">Other/tel protocol</SelectItem>
                    <SelectItem value="sip">Other/sip protocol</SelectItem>
                    <SelectItem value="none">None (Don't turn phone numbers into links)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                <Label className="text-right">Prepend phone</Label>
                <Input placeholder="" />
              </div>
              <p className="text-sm text-muted-foreground ml-[136px]">
                Do NOT use this for prepending country codes (that is done from the list configuration). Only use this if you need to send a personal dial code to the phone before the number.
              </p>
            </div>
            <Button onClick={handleSaveDialling} className="bg-[hsl(200,50%,45%)] hover:bg-[hsl(200,50%,40%)]">
              Update
            </Button>
          </div>
        );

      case "working":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="showTimer" 
                  checked={alwaysShowTimer}
                  onCheckedChange={(checked) => setAlwaysShowTimer(checked as boolean)}
                />
                <div>
                  <Label htmlFor="showTimer" className="cursor-pointer font-medium">
                    Always show timer
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show a small badge in the main menu with your active timer (if any). Helps to remember to pause or adjust when taking breaks or working on something else.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="viewOnly" 
                  checked={viewLeadsOnly}
                  onCheckedChange={(checked) => setViewLeadsOnly(checked as boolean)}
                />
                <div>
                  <Label htmlFor="viewOnly" className="cursor-pointer font-medium">
                    View leads only
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tick to disable locking and actioning leads. Useful for supervisors and admins to "peek" at leads without locking them.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="includeUnclaimed" 
                  checked={includeUnclaimed}
                  onCheckedChange={(checked) => setIncludeUnclaimed(checked as boolean)}
                />
                <div>
                  <Label htmlFor="includeUnclaimed" className="cursor-pointer font-medium">
                    Include unclaimed in schedule
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tick to include unclaimed leads in your scheduled leads overview.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="hotkeys" 
                  checked={hotkeys}
                  onCheckedChange={(checked) => setHotkeys(checked as boolean)}
                />
                <div>
                  <Label htmlFor="hotkeys" className="cursor-pointer font-medium">
                    Hotkeys
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable hotkeys when working leads.
                  </p>
                </div>
              </div>
            </div>

            {hotkeys && (
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Action Hotkeys</div>
                  <div className="text-muted-foreground">Use tab and hit "Enter" to select category</div>
                  <div className="text-right">C</div><div>Call back</div>
                  <div className="text-right">W</div><div>Winner</div>
                  <div className="text-right">L</div><div>Loser</div>
                  <div className="text-right">A</div><div>Archive</div>
                  <div className="font-medium mt-2">Other Hotkeys</div><div></div>
                  <div className="text-right">D</div><div>Dial now</div>
                  <div className="text-right">I</div><div>Write (input) a comment</div>
                  <div className="text-right">M</div><div>Compose email (message)</div>
                  <div className="text-right">H</div><div>View Activity tab (History)</div>
                  <div className="text-right">E</div><div>View Edit tab</div>
                  <div className="text-right">S</div><div>Search for a lead</div>
                </div>
              </div>
            )}

            <Button onClick={handleSaveWorking} className="bg-[hsl(200,50%,45%)] hover:bg-[hsl(200,50%,40%)]">
              Update
            </Button>
          </div>
        );

      case "email-dropbox":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground mb-4">
                Forward or BCC email to this address to attach it to a leads's history:
              </p>
              <div className="bg-muted p-6 rounded-md text-center">
                <p className="text-lg font-medium">{user?.email?.replace("@", "-")?.replace(".", "-")}@dropbox.app</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">How does the dropbox work?</h3>
              <Separator className="mb-4" />
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>FORWARD an email to your dropbox and the system will find the lead who wrote the email and attach the email to that lead's history.</li>
                <li>BCC your dropbox when you send an email and the email will be attached to the lead receiving the email.</li>
              </ul>
            </div>
          </div>
        );

      case "email":
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Configure your email integration settings here.
            </p>
            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">No email integration configured.</p>
            </div>
          </div>
        );

      case "texting":
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Configure your SMS/texting settings here.
            </p>
            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">No texting integration configured.</p>
            </div>
          </div>
        );

      case "queue":
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Configure your queue preferences here.
            </p>
            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">Queue settings will appear here.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-3rem)]">
        {/* Sidebar */}
        <div className="w-64 border-r bg-background">
          <nav className="py-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 text-sm transition-colors",
                  activeSection === item.id
                    ? "text-[hsl(200,50%,45%)] bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4",
                  activeSection === item.id ? "text-[hsl(200,50%,45%)]" : ""
                )} />
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          <h1 className="text-3xl font-light text-[hsl(200,50%,45%)] mb-2">Preferences</h1>
          <Separator className="mb-8 bg-[hsl(200,50%,45%)] h-0.5 w-16" />
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}
