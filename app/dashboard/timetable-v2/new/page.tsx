import {
  TimetableV2ProjectSetupWizard,
} from "@/components/timetable-v2/project-setup-wizard";

export default function TimetableV2NewProjectPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <TimetableV2ProjectSetupWizard />
    </main>
  );
}