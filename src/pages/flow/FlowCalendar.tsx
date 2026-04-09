import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";

export default function FlowCalendar() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Kalendar</h1>
      <ScheduleCalendar leadBasePath="/flow" sessionPath="/flow/session" />
    </div>
  );
}
