import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "manager" | "agent";
}

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeam = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    const teamMembers = (profiles || []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      role: (roles?.find((r) => r.user_id === p.id)?.role || "agent") as "admin" | "manager" | "agent",
    }));

    setMembers(teamMembers);
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, []);

  const updateRole = async (userId: string, newRole: "admin" | "manager" | "agent") => {
    await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    toast({ title: "Role updated" });
    fetchTeam();
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Team Management</h1>
          <p className="text-muted-foreground">{members.length} team members</p>
        </div>
        <div className="grid gap-4">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar><AvatarFallback>{member.full_name?.[0] || member.email[0].toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium">{member.full_name || member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <Select value={member.role} onValueChange={(v) => updateRole(member.id, v as "admin" | "manager" | "agent")}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}