import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFlowLeads, useUpdateLeadStatus } from "@/hooks/useFlowLeads";
import { cn } from "@/lib/utils";

const columns = [
  { key: "new", label: "New", emoji: "🟡", color: "border-t-amber-400" },
  { key: "answered", label: "Contacted", emoji: "🔵", color: "border-t-blue-400" },
  { key: "interested", label: "Interested", emoji: "🟢", color: "border-t-emerald-400" },
  { key: "not_interested", label: "Not Interested", emoji: "🔴", color: "border-t-red-400" },
];

export default function FlowPipeline() {
  const { data: leads = [], isLoading } = useFlowLeads();
  const updateStatus = useUpdateLeadStatus();

  const grouped = useMemo(() => {
    const groups: Record<string, typeof leads> = {};
    columns.forEach((c) => (groups[c.key] = []));
    leads.forEach((l) => {
      const col = columns.find((c) => c.key === l.status) ? l.status : "new";
      groups[col]?.push(l);
    });
    return groups;
  }, [leads]);

  const handleDrop = (leadId: string, newStatus: string) => {
    updateStatus.mutate({ leadId, status: newStatus });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col px-4 py-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Pipeline</h1>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 overflow-hidden">
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn("flex flex-col rounded-xl bg-muted/20 border-t-2", col.color)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const leadId = e.dataTransfer.getData("text/plain");
              if (leadId) handleDrop(leadId, col.key);
            }}
          >
            <div className="p-3 flex items-center gap-2">
              <span>{col.emoji}</span>
              <span className="text-sm font-medium">{col.label}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                {grouped[col.key]?.length || 0}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {isLoading
                ? [1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
                  ))
                : grouped[col.key]?.map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
                      className="border-border/30 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
                    >
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{lead.name || "Unknown"}</p>
                        {lead.company && (
                          <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                        )}
                        {lead.lastContactedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(lead.lastContactedAt).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
