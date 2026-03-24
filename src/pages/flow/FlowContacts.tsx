import { useState, useRef, useCallback } from "react";
import { Upload, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFlowLeads } from "@/hooks/useFlowLeads";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  new: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  answered: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  interested: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  not_interested: "bg-red-500/10 text-red-400 border-red-500/20",
  callback: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  no_answer: "bg-muted text-muted-foreground border-border",
};

export default function FlowContacts() {
  const { data: leads = [], isLoading } = useFlowLeads();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? leads.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.company.toLowerCase().includes(search.toLowerCase()) ||
          l.phone.includes(search)
      )
    : leads;

  const handleAddContact = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!user || !tenant) return;
      const fd = new FormData(e.currentTarget);
      const data = {
        name: fd.get("name") as string,
        company: fd.get("company") as string,
        phone: fd.get("phone") as string,
        email: fd.get("email") as string,
      };

      const { error } = await supabase.from("leads").insert({
        tenant_id: tenant.id,
        status: "new",
        data,
      });

      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        return;
      }
      toast({ title: "Contact added" });
      qc.invalidateQueries({ queryKey: ["flow-leads"] });
      setAddOpen(false);
    },
    [user, tenant, qc, toast]
  );

  const handleCSV = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !tenant) return;
      const text = await file.text();
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return;

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => ["name", "ime", "full_name"].includes(h));
      const companyIdx = headers.findIndex((h) => ["company", "tvrtka"].includes(h));
      const phoneIdx = headers.findIndex((h) => ["phone", "telefon", "tel"].includes(h));
      const emailIdx = headers.findIndex((h) => ["email", "e-mail", "e_mail"].includes(h));

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          tenant_id: tenant.id,
          status: "new" as const,
          data: {
            name: nameIdx >= 0 ? cols[nameIdx] : "",
            company: companyIdx >= 0 ? cols[companyIdx] : "",
            phone: phoneIdx >= 0 ? cols[phoneIdx] : "",
            email: emailIdx >= 0 ? cols[emailIdx] : "",
          },
        };
      });

      const { error } = await supabase.from("leads").insert(rows);
      if (error) {
        toast({ variant: "destructive", title: "Import failed", description: error.message });
      } else {
        toast({ title: `${rows.length} contacts imported` });
        qc.invalidateQueries({ queryKey: ["flow-leads"] });
      }
      e.target.value = "";
    },
    [tenant, qc, toast]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddContact} className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input name="name" required />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input name="company" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" />
                </div>
                <Button type="submit" className="w-full">Add Contact</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><div className="h-5 bg-muted/30 rounded animate-pulse" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No contacts found. Import a CSV or add manually.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{l.company || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{l.phone || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={statusColors[l.status] || ""}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                      {l.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
