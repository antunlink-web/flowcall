import { useNavigate } from "react-router-dom";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { useTranslation } from "@/hooks/useTranslation";

export default function FlowCalendar() {
  const t = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t.calendarTitle}</h1>
      <ScheduleCalendar
        onLeadClick={(leadId) => navigate(`lead/${leadId}`)}
        onCallClick={() => navigate("session")}
      />
    </div>
  );
}
