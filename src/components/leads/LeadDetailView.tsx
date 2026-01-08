import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Phone,
  Mail,
  MessageSquare,
  X,
  ArrowLeft,
  Loader2,
  ExternalLink,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Archive,
  Save,
  RefreshCw,
} from "lucide-react";

interface LeadDetailViewProps {
  leadId: string;
  onClose: () => void;
}

interface Lead {
  id: string;
  data: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
  list_id: string | null;
  campaign_id: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  call_attempts: number;
  callback_scheduled_at: string | null;
  last_contacted_at: string | null;
}

interface List {
  id: string;
  name: string;
  fields: Array<{ id: string; name: string; type: string; show: boolean }>;
}

export function LeadDetailView({ leadId, onClose }: LeadDetailViewProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*, lists(id, name, fields)")
      .eq("id", leadId)
      .single();

    if (error) {
      toast({ title: "Failed to load lead", variant: "destructive" });
      onClose();
      return;
    }

    setLead(data as Lead);
    setEditedData((data.data as Record<string, string>) || {});
    if (data.lists) {
      setList(data.lists as List);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);

    const { error } = await supabase
      .from("leads")
      .update({ data: editedData, updated_at: new Date().toISOString() })
      .eq("id", lead.id);

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      toast({ title: "Lead saved" });
      fetchLead();
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;

    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", lead.id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: `Status changed to ${newStatus}` });
      fetchLead();
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-cyan-500 text-white",
      contacted: "bg-blue-500 text-white",
      qualified: "bg-purple-500 text-white",
      callback: "bg-amber-500 text-white",
      won: "bg-green-600 text-white",
      lost: "bg-red-600 text-white",
      archived: "bg-gray-500 text-white",
    };
    return (
      <Badge className={`${colors[status] || "bg-muted"} capitalize`}>
        {status}
      </Badge>
    );
  };

  // Get primary display info - prioritize company name fields
  const getDisplayName = () => {
    if (!lead?.data) return "Unknown";
    const entries = Object.entries(lead.data);
    
    // Prioritize company name fields (Pavadinimas, Company, etc.)
    const companyFields = ["pavadinimas", "company", "company name", "įmonė", "firma"];
    for (const [key, value] of entries) {
      if (companyFields.includes(key.toLowerCase()) && typeof value === "string" && value.trim()) {
        return value;
      }
    }
    
    // Fallback to first non-empty string value
    for (const [key, value] of entries) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return "Unknown";
  };

  const getPhones = () => {
    if (!lead?.data) return [];
    const phones: string[] = [];
    for (const [key, value] of Object.entries(lead.data)) {
      const keyLower = key.toLowerCase();
      if (
        (keyLower.includes("phone") || keyLower.includes("tel")) &&
        typeof value === "string" &&
        value.trim()
      ) {
        phones.push(value);
      }
    }
    return phones;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) return null;

  const phones = getPhones();
  const displayName = getDisplayName();
  const listFields = list?.fields || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                {getStatusBadge(lead.status)}
                <h1 className="text-xl font-semibold">{displayName}</h1>
              </div>
              {phones.map((phone, i) => (
                <a
                  key={i}
                  href={`tel:${phone}`}
                  className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                >
                  {phone}
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Column - Lead Info & Actions */}
        <div className="flex-1 p-6 space-y-6 border-r max-w-2xl">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {Object.entries(lead.data || {})
              .filter(([key, value]) => {
                const keyLower = key.toLowerCase();
                return !(keyLower.includes("phone") || keyLower.includes("tel"));
              })
              .slice(0, 6)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground font-medium">{key}</span>
                  <span className="text-right">
                    {String(value || "").startsWith("http") ? (
                      <a
                        href={String(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {String(value)}
                      </a>
                    ) : (
                      String(value || "-")
                    )}
                  </span>
                </div>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm border-t pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">First created</span>
              <span>
                {format(new Date(lead.created_at), "dd-MM-yyyy HH:mm")} (
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: false })} ago)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last updated</span>
              <span>
                {format(new Date(lead.updated_at), "dd-MM-yyyy HH:mm")} (
                {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: false })} ago)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current List</span>
              <span className="text-primary">
                {list?.name || "No list"} →
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimed by</span>
              <span>{lead.claimed_by ? "Claimed" : "Not claimed - Claim now"}</span>
            </div>
          </div>

          {/* Communication Tabs */}
          <Tabs defaultValue="call" className="mt-6">
            <TabsList>
              <TabsTrigger value="call" className="gap-1">
                <Phone className="w-4 h-4" />
                Call
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1">
                <Mail className="w-4 h-4" />
                E-mail
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-1">
                <MessageSquare className="w-4 h-4" />
                SMS
              </TabsTrigger>
            </TabsList>
            <TabsContent value="call" className="mt-4">
              <div className="border rounded-md p-4 space-y-4">
                <Textarea
                  placeholder="Comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Follow-up</span>
                  <Select defaultValue="after">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after">after</SelectItem>
                      <SelectItem value="on">on</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="27">
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="27">27 hours</SelectItem>
                      <SelectItem value="48">2 days</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="gap-1 bg-[hsl(200,20%,35%)]"
                    onClick={() => handleStatusChange("callback")}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Call back
                  </Button>
                  <Button
                    variant="default"
                    className="gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange("won")}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Winner
                  </Button>
                  <Button
                    variant="default"
                    className="gap-1 bg-red-600 hover:bg-red-700"
                    onClick={() => handleStatusChange("lost")}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Loser
                  </Button>
                  <Button
                    variant="secondary"
                    className="gap-1"
                    onClick={() => handleStatusChange("archived")}
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="email" className="mt-4">
              <div className="text-muted-foreground text-sm">
                Email composer coming soon...
              </div>
            </TabsContent>
            <TabsContent value="sms" className="mt-4">
              <div className="text-muted-foreground text-sm">
                SMS composer coming soon...
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Editable Fields */}
        <div className="w-96 p-6 space-y-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="fields">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="colleagues">Colleagues</TabsTrigger>
                <TabsTrigger value="fields">
                  <ExternalLink className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-20 bg-red-600 hover:bg-red-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>

          <div className="space-y-3">
            {listFields.length > 0
              ? listFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <label className="w-32 text-sm text-muted-foreground text-right flex-shrink-0">
                      {field.name}
                    </label>
                    <Input
                      value={editedData[field.name] || ""}
                      onChange={(e) =>
                        setEditedData({ ...editedData, [field.name]: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Checkbox />
                  </div>
                ))
              : Object.entries(editedData).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="w-32 text-sm text-muted-foreground text-right flex-shrink-0">
                      {key}
                    </label>
                    <Input
                      value={String(value || "")}
                      onChange={(e) =>
                        setEditedData({ ...editedData, [key]: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Checkbox />
                  </div>
                ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-20 bg-red-600 hover:bg-red-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchLead}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
