import { useParams, useNavigate } from "react-router-dom";
import { LeadDetailView } from "@/components/leads/LeadDetailView";

export default function FlowLeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  if (!leadId) {
    navigate(-1);
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <LeadDetailView leadId={leadId} onClose={() => navigate(-1)} />
    </div>
  );
}
