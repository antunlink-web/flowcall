import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Workflow,
  Phone,
  Smartphone,
  Headset,
  Mail,
  MessageSquare,
  Clock,
  BarChart3,
  Globe,
  MinusCircle,
  ChevronRight,
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

const sidebarItems = [
  { icon: Workflow, label: "Workflow Settings", id: "workflow" },
  { icon: Phone, label: "Dialler", id: "dialler" },
  { icon: Mail, label: "Email", id: "email" },
  { icon: MessageSquare, label: "Messaging", id: "messaging" },
  { icon: Clock, label: "Time", id: "time" },
  { icon: BarChart3, label: "Reports", id: "reports" },
  { icon: Globe, label: "Integrations/API", id: "integrations" },
  { icon: MinusCircle, label: "Restrictions", id: "restrictions" },
];

export default function ManageSettings() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("workflow");

  // Workflow Settings State
  const [searchAllLeads, setSearchAllLeads] = useState(false);
  const [enableSkip, setEnableSkip] = useState(false);
  const [callbackName, setCallbackName] = useState("Call back");
  const [winnerName, setWinnerName] = useState("Winner");
  const [loserName, setLoserName] = useState("Loser");
  const [archiveName, setArchiveName] = useState("Archive");
  const [skipName, setSkipName] = useState("Skip");
  const [queueAlgorithm, setQueueAlgorithm] = useState("next-best");
  const [advancedFilters, setAdvancedFilters] = useState(true);
  const [autoClaimWinner, setAutoClaimWinner] = useState(true);
  const [autoClaimScheduling, setAutoClaimScheduling] = useState(true);
  const [autoClaimPostponing, setAutoClaimPostponing] = useState(true);
  const [claimsExpireAfter, setClaimsExpireAfter] = useState("60");
  const [disableAutoRelease, setDisableAutoRelease] = useState(false);
  const [defaultActiveTab, setDefaultActiveTab] = useState("edit");

  // Dialler State
  const [selectedDialler, setSelectedDialler] = useState<string | null>(null);
  const [diallerProtocol, setDiallerProtocol] = useState("sip");
  const [prependPhone, setPrependPhone] = useState("");
  const [autoDial, setAutoDial] = useState(false);

  // Restrictions State
  const [restrictIps, setRestrictIps] = useState("");

  const renderContent = () => {
    switch (activeSection) {
      case "workflow":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary mb-2">Workflow Settings</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {/* Search Section */}
            <div>
              <h2 className="text-xl font-medium mb-4">Search</h2>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="searchAllLeads"
                  checked={searchAllLeads}
                  onCheckedChange={(v) => setSearchAllLeads(!!v)}
                />
                <div>
                  <Label htmlFor="searchAllLeads" className="font-medium">Search all leads</Label>
                  <p className="text-sm text-muted-foreground">
                    Include leads from lists not assigned to the user when searching. These leads will only preview in the search result and they can't be accessed.
                  </p>
                </div>
              </div>
            </div>

            {/* Lead Actions Section */}
            <div>
              <h2 className="text-xl font-medium mb-4">Lead Actions</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="enableSkip"
                    checked={enableSkip}
                    onCheckedChange={(v) => setEnableSkip(!!v)}
                  />
                  <div>
                    <Label htmlFor="enableSkip" className="font-medium">Enable skip</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow skipping leads by adding a 'Skip'-action when working leads.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <Label className="text-right pt-2">Call back action name</Label>
                  <div>
                    <Input value={callbackName} onChange={(e) => setCallbackName(e.target.value)} />
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose your own disposition name for call backs. Default is "Call back"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <Label className="text-right pt-2">Winner action name</Label>
                  <div>
                    <Input value={winnerName} onChange={(e) => setWinnerName(e.target.value)} />
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose your own disposition name for successes. Default is "Winner"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <Label className="text-right pt-2">Loser action name</Label>
                  <div>
                    <Input value={loserName} onChange={(e) => setLoserName(e.target.value)} />
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose your own disposition name for lost leads. Default is "Loser"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <Label className="text-right pt-2">Archive action name</Label>
                  <div>
                    <Input value={archiveName} onChange={(e) => setArchiveName(e.target.value)} />
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose your own disposition name for invalid leads. Default is "Archive"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <Label className="text-right pt-2">Skip action name</Label>
                  <div>
                    <Input value={skipName} onChange={(e) => setSkipName(e.target.value)} />
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose your own disposition name for skipping leads. Default is "Skip"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Queues Section */}
            <div>
              <h2 className="text-xl font-medium mb-4">Queues</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <Label className="text-right pt-2">Algorithm</Label>
                  <div>
                    <RadioGroup value={queueAlgorithm} onValueChange={setQueueAlgorithm}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="next-best" id="next-best" />
                        <Label htmlFor="next-best" className="text-primary">Next Best Lead</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="most-due" id="most-due" />
                        <Label htmlFor="most-due" className="text-primary">Most Due First</Label>
                      </div>
                    </RadioGroup>
                    <p className="text-sm text-muted-foreground mt-2">
                      The queue algorithm controls how your follow-ups are prioritised. Read more in our{" "}
                      <span className="text-primary cursor-pointer">queueing guide</span>.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Prioritising new leads is controlled on each individual list from the list configuration under "Queueing".
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Users can also add filters to their queue and control sorting of unscheduled leads. The user queue settings are individual to each user.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 ml-[216px]">
                  <Checkbox
                    id="advancedFilters"
                    checked={advancedFilters}
                    onCheckedChange={(v) => setAdvancedFilters(!!v)}
                  />
                  <div>
                    <Label htmlFor="advancedFilters" className="text-primary font-medium">Advanced queue filters</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow for agents to apply advanced filters and sorting to their queues.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Claiming Section */}
            <div>
              <h2 className="text-xl font-medium mb-4">Claiming</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 ml-[216px]">
                  <Checkbox
                    id="autoClaimWinner"
                    checked={autoClaimWinner}
                    onCheckedChange={(v) => setAutoClaimWinner(!!v)}
                  />
                  <div>
                    <Label htmlFor="autoClaimWinner" className="text-primary font-medium">Auto claim on Winner</Label>
                    <p className="text-sm text-muted-foreground">
                      Leads are automatically claimed when marked 'Winner'.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 ml-[216px]">
                  <Checkbox
                    id="autoClaimScheduling"
                    checked={autoClaimScheduling}
                    onCheckedChange={(v) => setAutoClaimScheduling(!!v)}
                  />
                  <div>
                    <Label htmlFor="autoClaimScheduling" className="text-primary font-medium">Auto claim when scheduling</Label>
                    <p className="text-sm text-muted-foreground">
                      Leads are automatically claimed when agents schedule a lead for call back 'in exactly' a specific time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 ml-[216px]">
                  <Checkbox
                    id="autoClaimPostponing"
                    checked={autoClaimPostponing}
                    onCheckedChange={(v) => setAutoClaimPostponing(!!v)}
                  />
                  <div>
                    <Label htmlFor="autoClaimPostponing" className="text-primary font-medium">Auto claim when postponing</Label>
                    <p className="text-sm text-muted-foreground">
                      Leads are automatically claimed when agents schedule a lead for call back 'after' a specific time.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                  <Label className="text-right pt-2">Claims expire after</Label>
                  <div>
                    <Input
                      value={claimsExpireAfter}
                      onChange={(e) => setClaimsExpireAfter(e.target.value)}
                      className="w-32"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Claimed leads are automatically released by the system this amount of days after becoming due.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 ml-[216px]">
                  <Checkbox
                    id="disableAutoRelease"
                    checked={disableAutoRelease}
                    onCheckedChange={(v) => setDisableAutoRelease(!!v)}
                  />
                  <div>
                    <Label htmlFor="disableAutoRelease" className="font-medium">Disable automatic release of claimed leads</Label>
                    <p className="text-sm text-muted-foreground">
                      Note: deleting a user will still release that users leads upon deletion.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead View Section */}
            <div>
              <h2 className="text-xl font-medium mb-4">Lead View</h2>
              <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
                <Label className="text-right pt-2">Default active tab</Label>
                <div>
                  <Select value={defaultActiveTab} onValueChange={setDefaultActiveTab}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose the default tab when no activity is present.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
              <span className="text-muted-foreground">or</span>
              <Button variant="link" className="text-primary p-0">Cancel</Button>
            </div>
          </div>
        );

      case "dialler":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary mb-2">
                Dialler <span className="text-xl text-muted-foreground font-normal">Please choose your dialler below for instructions to configure dialling.</span>
              </h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            <div className="space-y-4">
              {/* Powerdialer Voice */}
              <div 
                className={`border rounded p-6 cursor-pointer transition-colors ${selectedDialler === 'voice' ? 'border-primary bg-accent/30' : 'border-border hover:bg-accent/50'}`}
                onClick={() => setSelectedDialler(selectedDialler === 'voice' ? null : 'voice')}
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    <Phone className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-primary">Powerdialer Voice</h3>
                    <p className="text-muted-foreground">Coming soon</p>
                  </div>
                </div>
              </div>

              {/* Powerdialer Smart */}
              <div 
                className={`border rounded p-6 cursor-pointer transition-colors ${selectedDialler === 'smart' ? 'border-primary bg-accent/30' : 'border-border hover:bg-accent/50'}`}
                onClick={() => setSelectedDialler(selectedDialler === 'smart' ? null : 'smart')}
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-primary">Powerdialer Smart</h3>
                    <p className="text-muted-foreground">Use your smartphone's plan to call Powerdialer contact. No need for complicated calling system.</p>
                  </div>
                </div>
                {selectedDialler === 'smart' && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold text-center mb-6">Marvelous choice. Here's how to get started:</h4>
                    <div className="space-y-4 max-w-2xl mx-auto">
                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded">
                        <span className="text-2xl font-light text-muted-foreground">1</span>
                        <p>Log in to Powerdialer from your mobile phone's browser.</p>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded">
                        <span className="text-2xl font-light text-muted-foreground">2</span>
                        <p>Start working your Powerdialer <span className="text-primary cursor-pointer">queue</span> in your desktop or laptop browser.</p>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded">
                        <span className="text-2xl font-light text-muted-foreground">3</span>
                        <p className="text-primary">Your phone will automatically prompt you to call the lead.</p>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded">
                        <span className="text-2xl font-light text-muted-foreground">4</span>
                        <p className="text-primary">If the phone enters lock screen it may miss a lead. No worries, simply swipe down and release to refresh the lead and dial it.</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-6 text-center">
                      For an even smoother experience, we recommend saving Powerdialer to your Home screen:
                    </p>
                    <ul className="text-sm text-primary mt-2 list-disc list-inside text-center space-y-1">
                      <li>On an iPhone, click the sharing icon at the bottom of the browser, then select "Add to Home Screen".</li>
                      <li>On an Android phone, click the menu button in the upper right corner, then select "Add to Home Screen".</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Other / Softphone */}
              <div 
                className={`border rounded p-6 cursor-pointer transition-colors ${selectedDialler === 'softphone' ? 'border-primary bg-accent/30' : 'border-border hover:bg-accent/50'}`}
                onClick={() => setSelectedDialler(selectedDialler === 'softphone' ? null : 'softphone')}
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    <Headset className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-primary">Other / Softphone</h3>
                    <p className="text-muted-foreground">Use your existing softphone and/or a VOIP subscription with your favourite provider.</p>
                  </div>
                </div>
                {selectedDialler === 'softphone' && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold text-center mb-4">Great choice. Here's how to get started:</h4>
                    <p className="text-muted-foreground text-center mb-6">Powerdialer supports any VOIP softphone that is click-to-call compliant.</p>
                    <p className="text-sm text-muted-foreground text-center mb-4">You can experiment with different call handlers from your preferences.</p>
                    
                    <div className="max-w-md mx-auto space-y-4 p-4 border rounded bg-muted/30">
                      <h5 className="font-medium">Dialer settings</h5>
                      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                        <Label>Dialer</Label>
                        <Select value={diallerProtocol} onValueChange={setDiallerProtocol}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sip">Other/sip protocol</SelectItem>
                            <SelectItem value="tel">Tel protocol</SelectItem>
                            <SelectItem value="callto">Callto protocol</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                        <Label className="pt-2">Prepend phone</Label>
                        <div>
                          <Input 
                            value={prependPhone} 
                            onChange={(e) => setPrependPhone(e.target.value)} 
                            placeholder="+316"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Prepend all phone numbers with this. Useful if you need to send a dial code to the phone before the number.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="autoDial"
                          checked={autoDial}
                          onCheckedChange={(v) => setAutoDial(!!v)}
                        />
                        <div>
                          <Label htmlFor="autoDial">AutoDial</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically click the phone number when loading a lead on screen.
                          </p>
                        </div>
                      </div>
                      <Button className="bg-destructive hover:bg-destructive/90">Update</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "email":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary mb-2">Email</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">Manage Connected Email Adresses</h2>
              <div className="w-16 h-0.5 bg-primary mb-4" />

              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                <p className="text-sm">
                  <span className="font-bold">Please note:</span> Users can only have one email connected at any time. When you assign users to an email connection, any previous assignments will be replaced.
                </p>
              </div>

              <div className="border border-border rounded overflow-hidden mb-8">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Users</th>
                      <th className="text-left p-3 font-medium">Remarks</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-destructive" />
                          <div>
                            <div className="font-medium">Gera Valia</div>
                            <div className="text-sm text-muted-foreground">&lt;paramai@geravalia.lt&gt;</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">Team Members</td>
                      <td className="p-3 text-sm text-muted-foreground">No remarks</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">Delete</Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">Add Email Addresses</h2>
              <div className="w-16 h-0.5 bg-primary mb-4" />

              <div className="space-y-6">
                {/* Gmail */}
                <div className="border border-border rounded p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                      <Mail className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-serif text-primary mb-2">Gmail</h3>
                      <p className="text-muted-foreground mb-2">Connect a Google account to send email through Gmail.</p>
                      <ul className="text-sm text-primary list-disc list-inside space-y-1">
                        <li>Emails sent from Myphoner are sent from your own email account and are stored in your sent folder as well. Replies will also arrive in your inbox.</li>
                        <li>Replies to emails you send through Myphoner is recorded in the leads' activity log and schedules the lead for immediate followup.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Outlook */}
                <div className="border border-border rounded p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">O</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-serif text-primary mb-2">Outlook 365</h3>
                      <p className="text-muted-foreground mb-2">Connect a Microsoft account (Office 365) to send email through Outlook.</p>
                      <ul className="text-sm text-primary list-disc list-inside space-y-1">
                        <li>Emails sent from Myphoner are sent from your own email account and are stored in your sent folder as well. Replies will also arrive in your inbox.</li>
                        <li>Replies to emails you send through Myphoner is recorded in the leads' activity log and schedules the lead for immediate followup.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Verified Sender */}
                <div className="border border-border rounded p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-orange-100 rounded flex items-center justify-center">
                      <span className="text-3xl font-bold text-orange-500">P</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-serif text-primary mb-2">Verified Sender Address</h3>
                      <p className="text-muted-foreground mb-2">Verify an email address to send email through our servers.</p>

                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>The name of the sender (from name)</Label>
                          <Input placeholder="John from Great Company" className="mt-1" />
                        </div>
                        <div>
                          <Label>E-mail you wish to send from</Label>
                          <Input placeholder="E-mail" className="mt-1" />
                        </div>
                        <Button className="bg-destructive hover:bg-destructive/90">Verify address now</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "messaging":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary mb-2">
                Messaging <span className="text-xl text-muted-foreground font-normal">Please choose your messaging provider below for instructions to configure messaging.</span>
              </h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            <div className="space-y-4">
              <div className="border border-border rounded p-6 flex items-center gap-6 hover:bg-accent/50 cursor-pointer">
                <div className="w-16 h-16 bg-green-100 rounded flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-serif text-primary">Bird</h3>
                  <p className="text-muted-foreground">Bird helps marketing, service, and engineering teams create personalized interactions that drive customer growth.</p>
                </div>
              </div>

              <div className="border border-border rounded p-6 flex items-center gap-6 hover:bg-accent/50 cursor-pointer">
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  ⊕
                </div>
                <div>
                  <h3 className="text-xl font-serif text-primary">Twilio</h3>
                  <p className="text-muted-foreground">A leading cloud communications platform, offering a comprehensive suite of communication services.</p>
                </div>
              </div>

              <div className="border border-border rounded p-6 flex items-center gap-6 hover:bg-accent/50 cursor-pointer">
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-serif text-primary">Fortytwo</h3>
                  <p className="text-muted-foreground">A highly trusted mobile engagement solutions provider for multiple international brands.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "restrictions":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Restrictions</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <Label className="text-right pt-2 font-medium">Restrict Access To These IPs</Label>
              <div>
                <Input
                  value={restrictIps}
                  onChange={(e) => setRestrictIps(e.target.value)}
                  placeholder=""
                  className="max-w-xl"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Agents can only access the account from this list of allowed IP-addresses. Separate multiple addresses by comma (,).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
              <span className="text-muted-foreground">or</span>
              <Button variant="link" className="text-primary p-0">Cancel</Button>
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

      {/* Main Content with Sidebar */}
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-background">
          <nav className="p-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-sm transition-colors ${
                  activeSection === item.id
                    ? "text-primary font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${activeSection === item.id ? "text-primary" : ""}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeSection === item.id ? "text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 max-w-4xl">
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}
