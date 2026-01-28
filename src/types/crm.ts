export type LeadStatus = "new" | "contacted" | "qualified" | "callback" | "won" | "lost" | "archived";
export type CallOutcome = "answered" | "no_answer" | "busy" | "voicemail" | "callback" | "won" | "lost";

export interface Lead {
  id: string;
  data: Record<string, unknown>;
  status: LeadStatus;
  list_id: string | null;
  campaign_id: string | null;
  assigned_to: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  call_attempts: number;
  last_contacted_at: string | null;
  callback_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to get a field value from lead data
export function getLeadField(lead: Lead, field: string): string {
  const value = lead.data?.[field];
  return value != null ? String(value) : "";
}

// Helper to get display name for a lead
// If listFields are provided, uses the first field as the display name
export function getLeadDisplayName(lead: Lead, listFields?: { name: string }[]): string {
  // If list has defined fields, use the first field as the display name
  if (listFields && listFields.length > 0) {
    const firstFieldName = listFields[0].name;
    const firstFieldValue = getLeadField(lead, firstFieldName);
    if (firstFieldValue) return firstFieldValue;
  }
  
  // Fall back to common name field patterns
  const firstName = getLeadField(lead, "first_name") || getLeadField(lead, "firstname") || getLeadField(lead, "name");
  const lastName = getLeadField(lead, "last_name") || getLeadField(lead, "lastname");
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

// Helper to get common fields
export function getLeadPhone(lead: Lead): string {
  return getLeadField(lead, "phone") || getLeadField(lead, "telephone") || getLeadField(lead, "mobile");
}

export function getLeadEmail(lead: Lead): string {
  return getLeadField(lead, "email") || getLeadField(lead, "e-mail");
}

export function getLeadCompany(lead: Lead): string {
  return getLeadField(lead, "company") || getLeadField(lead, "organization") || getLeadField(lead, "business");
}

export function getLeadNotes(lead: Lead): string {
  return getLeadField(lead, "notes") || getLeadField(lead, "note") || getLeadField(lead, "comments");
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string;
  user_id: string;
  outcome: CallOutcome;
  notes: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  lead_id: string;
  user_id: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "pending";
  created_at: string;
}

export interface SmsLog {
  id: string;
  lead_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface CallScript {
  id: string;
  name: string;
  content: string;
  campaign_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmtpSettings {
  id: string;
  user_id: string | null;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string | null;
  use_tls: boolean;
  created_at: string;
  updated_at: string;
}