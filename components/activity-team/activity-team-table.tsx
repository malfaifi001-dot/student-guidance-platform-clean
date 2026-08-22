import { UserRound } from "lucide-react";
import { SCHOOL_ACTIVITY_TEAM_FIELDS } from "@/lib/activity-team/activity-team-config";
import { getArabicActivitySupervisorLabel } from "@/lib/auth/user-role-display";

export type ActivityTeamAssignments = Record<string, string>;

export function ActivityTeamTable({
  assignments,
  gender,
  editable = false,
  onChange,
}: {
  assignments: ActivityTeamAssignments;
  gender: string;
  editable?: boolean;
  onChange?: (key: string, value: string) => void;
}) {
  const supervisorLabel = getArabicActivitySupervisorLabel(gender);

  return (
    <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20">
      <table className="w-full min-w-[680px] border-collapse text-right" dir="rtl">
        <caption className="sr-only">مجالات فريق النشاط الطلابي بالمدرسة</caption>
        <thead>
          <tr className="bg-slate-900 text-white dark:bg-slate-800">
            <th className="w-20 border-l border-white/15 px-4 py-4 text-center text-sm font-black">م</th>
            <th className="border-l border-white/15 px-5 py-4 text-sm font-black">مجال النشاط</th>
            <th className="px-5 py-4 text-sm font-black">اسم {supervisorLabel}</th>
          </tr>
        </thead>
        <tbody>
          {SCHOOL_ACTIVITY_TEAM_FIELDS.map((field, index) => (
            <tr key={field.key} className="border-b border-slate-100 last:border-0 even:bg-slate-50/70 dark:border-slate-800 dark:even:bg-slate-900/55">
              <td className="border-l border-slate-100 px-4 py-4 text-center text-sm font-black text-slate-500 dark:border-slate-800 dark:text-slate-400">{index + 1}</td>
              <th scope="row" className="border-l border-slate-100 px-5 py-4 text-sm font-black text-slate-800 dark:border-slate-800 dark:text-slate-100">{field.label}</th>
              <td className="px-5 py-3">
                {editable ? (
                  <label className="relative block">
                    <span className="sr-only">اسم {supervisorLabel} لمجال {field.label}</span>
                    <input
                      value={assignments[field.key] || ""}
                      onChange={(event) => onChange?.(field.key, event.target.value)}
                      placeholder={`اكتب اسم ${supervisorLabel}`}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pe-11 text-sm font-black text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-sky-300 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-sky-500/60 dark:focus:border-sky-400 dark:focus:bg-slate-950 dark:focus:ring-sky-500/15"
                    />
                    <UserRound className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  </label>
                ) : (
                  <span className="block min-h-8 rounded-xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">{assignments[field.key] || "—"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
