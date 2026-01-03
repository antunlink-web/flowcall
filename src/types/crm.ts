export type LeadStatus = "new" | "contacted" | "qualified" | "callback" | "won" | "lost" | "archived";
export type CallOutcome = "answered" | "no_answer" | "busy" | "voicemail" | "callback" | "won" | "lost";

export interface Lead {
  id: string;
  first_name: string;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: LeadStatus;
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