import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Plus, Pencil, Trash2, Mail, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";

type RoleType = "owner" | "account_manager" | "agent";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  roles: RoleType[];
}

interface Invitation {
  id: string;
  email: string;
  full_name: string | null;
  role: RoleType;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Pipeline", href: "/manage/pipeline" },
  { label: "Users", href: "/team" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
  { label: "Settings", href: "/settings" },
  { label: "Account", href: "/manage/account" },
];

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "invited" | "archived">("active");
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [totalSeats, setTotalSeats] = useState(4);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleType>("agent");
  const [inviting, setInviting] = useState(false);
  
  const { toast } = useToast();
  const { isOwner } = useUserRole();

  const usedSeats = members.length;
  const availableSeats = Math.max(0, totalSeats - usedSeats);
  const pendingInvitations = invitations.filter(i => !i.accepted_at);

  const fetchSeats = async () => {
    const { data } = await supabase
      .from("account_settings")
      .select("setting_value")
      .eq("setting_key", "seats")
      .maybeSingle();
    
    if (data?.setting_value) {
      const value = data.setting_value as { total?: number };
      setTotalSeats(value.total || 4);
    }
  };

  const fetchTeam = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: allRoles } = await supabase.from("user_roles").select("*");

    const teamMembers = (profiles || []).map((p) => {
      const userRoles = (allRoles || [])
        .filter((r) => r.user_id === p.id)
        .map((r) => r.role as RoleType);
      
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        roles: userRoles.length > 0 ? userRoles : ["agent" as RoleType],
      };
    });

    setMembers(teamMembers);
    setLoading(false);
  };

  const fetchInvitations = async () => {
    const { data } = await supabase
      .from("user_invitations")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setInvitations(data as Invitation[]);
    }
  };

  useEffect(() => {
    fetchSeats();
    fetchTeam();
    fetchInvitations();
  }, []);

  const updateRole = async (userId: string, newRoles: RoleType[]) => {
    // Delete existing roles
    await supabase.from("user_roles").delete().eq("user_id", userId);
    
    // Insert new roles
    for (const role of newRoles) {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    
    toast({ title: "Roles updated" });
    fetchTeam();
    setEditDialogOpen(false);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("invite-user", {
        body: {
          email: inviteEmail,
          role: inviteRole,
          fullName: inviteFullName || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "Invitation sent", description: `Invitation sent to ${inviteEmail}` });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteFullName("");
      setInviteRole("agent");
      fetchInvitations();
    } catch (error: any) {
      toast({ 
        title: "Failed to send invitation", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    const { error } = await supabase
      .from("user_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      toast({ 
        title: "Failed to delete invitation", 
        description: error.message,
        variant: "destructive" 
      });
      return;
    }

    toast({ title: "Invitation deleted", description: `Invitation for ${email} has been removed` });
    fetchInvitations();
  };

  const handleArchiveUser = async (userId: string, email: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "archived" })
      .eq("id", userId);

    if (error) {
      toast({ 
        title: "Failed to archive user", 
        description: error.message,
        variant: "destructive" 
      });
      return;
    }

    toast({ title: "User archived", description: `${email} has been archived` });
    fetchTeam();
  };

  const isAccountOwner = (member: TeamMember) => member.roles.includes("owner");

  const getRoleBadges = (roles: RoleType[]) => {
    const badges: { label: string; variant: "default" | "secondary" }[] = [];
    
    if (roles.includes("owner")) {
      badges.push({ label: "Account Owner", variant: "default" });
    }
    if (roles.includes("account_manager")) {
      badges.push({ label: "Account Manager", variant: "default" });
    }
    if (roles.includes("agent")) {
      badges.push({ label: "Agent", variant: "secondary" });
    }
    
    return badges;
  };
  
  const getRoleDisplayName = (role: RoleType) => {
    switch (role) {
      case "owner": return "Account Owner";
      case "account_manager": return "Account Manager";
      case "agent": return "Agent";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <a
              key={item.label}
              href={item.href}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                item.label === "Users"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-light text-primary">Manage Users</h1>
            <div className="w-16 h-0.5 bg-primary mt-2" />
          </div>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Seats Info */}
        <div className="my-8 text-center">
          <p className="text-lg text-muted-foreground">
            You currently have <span className="font-bold text-foreground">{usedSeats}</span> users and{" "}
            <span className="font-bold text-foreground">{availableSeats}</span> available seats.
          </p>
          
          {/* Progress Bar */}
          <div className="flex mt-4 rounded-md overflow-hidden h-8">
            <div
              className="bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium"
              style={{ width: `${(usedSeats / totalSeats) * 100}%` }}
            >
              {usedSeats} Used
            </div>
            <div
              className="bg-green-600 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${(availableSeats / totalSeats) * 100}%` }}
            >
              {availableSeats} Available
            </div>
          </div>
        </div>

        {/* Tabs and Invite Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("active")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "active"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Active ({members.length})
            </button>
            <button
              onClick={() => setActiveTab("invited")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "invited"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Invited ({pendingInvitations.length})
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "archived"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Archived (0)
            </button>
          </div>
          
          {isOwner && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite a user
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-name">Full Name (optional)</Label>
                    <Input
                      id="invite-name"
                      type="text"
                      placeholder="John Doe"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as RoleType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Account Owner</SelectItem>
                        <SelectItem value="account_manager">Account Manager</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleInviteUser}
                    disabled={inviting}
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {!isOwner && (
            <Button className="bg-green-600 hover:bg-green-700 text-white" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Invite a user
            </Button>
          )}
        </div>

        {/* Content based on active tab */}
        {activeTab === "active" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="w-[100px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-primary">
                    {member.full_name || member.email.split("@")[0]}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getRoleBadges(member.roles).map((badge, idx) => (
                        <Badge
                          key={idx}
                          variant={badge.variant}
                          className={
                            badge.variant === "default"
                              ? "bg-primary/80 hover:bg-primary"
                              : "bg-muted-foreground/60 hover:bg-muted-foreground/80"
                          }
                        >
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Dialog open={editDialogOpen && editingMember?.id === member.id} onOpenChange={(open) => {
                        setEditDialogOpen(open);
                        if (open) setEditingMember(member);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User Roles</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Name</Label>
                              <Input value={member.full_name || ""} disabled />
                            </div>
                            <div>
                              <Label>Email</Label>
                              <Input value={member.email} disabled />
                            </div>
                            <div>
                              <Label>Roles</Label>
                              <div className="space-y-2 mt-2">
                                {(["owner", "account_manager", "agent"] as RoleType[]).map((roleOption) => (
                                  <div key={roleOption} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`role-${member.id}-${roleOption}`}
                                      checked={member.roles.includes(roleOption)}
                                      onChange={(e) => {
                                        let newRoles: RoleType[];
                                        if (e.target.checked) {
                                          newRoles = [...member.roles, roleOption];
                                          // Auto-add agent if adding owner or account_manager
                                          if ((roleOption === "owner" || roleOption === "account_manager") && !newRoles.includes("agent")) {
                                            newRoles.push("agent");
                                          }
                                        } else {
                                          newRoles = member.roles.filter(r => r !== roleOption);
                                        }
                                        // Ensure at least agent role
                                        if (newRoles.length === 0) {
                                          newRoles = ["agent"];
                                        }
                                        updateRole(member.id, newRoles);
                                      }}
                                      className="h-4 w-4"
                                    />
                                    <label htmlFor={`role-${member.id}-${roleOption}`}>
                                      {getRoleDisplayName(roleOption)}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {isAccountOwner(member) ? (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-50"
                          disabled
                          title="Cannot delete the account owner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will archive {member.full_name || member.email}. They will no longer be able to access the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleArchiveUser(member.id, member.email)}
                              >
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {activeTab === "invited" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No pending invitations
                  </TableCell>
                </TableRow>
              ) : (
                pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium text-primary">
                      {invitation.full_name || invitation.email.split("@")[0]}
                    </TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getRoleDisplayName(invitation.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Pending</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete invitation?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the invitation for {invitation.email}. They will no longer be able to use the invite link.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteInvitation(invitation.id, invitation.email)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {activeTab === "archived" && (
          <div className="text-center text-muted-foreground py-8">
            No archived users
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
