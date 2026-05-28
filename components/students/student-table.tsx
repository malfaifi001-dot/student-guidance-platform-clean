type StudentTableProps = {
  students: Array<{
    id: string;
    fullName: string;
    nationalId: string | null;
    gender: string;
    stage: string | null;
    grade: string | null;
    classroom: string | null;
    guardian: {
      name: string;
      phone: string | null;
    } | null;
  }>;
};

export function StudentTable({ students }: StudentTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white card-shadow">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-xl font-black text-slate-900">بيانات الطلاب</h2>
        <p className="mt-1 text-sm text-slate-500">
          هذه البيانات ستغذي كل الخدمات لاحقًا عبر Smart Student Picker.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-4">الاسم</th>
              <th className="p-4">الهوية</th>
              <th className="p-4">الجنس</th>
              <th className="p-4">المرحلة</th>
              <th className="p-4">الصف</th>
              <th className="p-4">الفصل</th>
              <th className="p-4">ولي الأمر</th>
              <th className="p-4">الجوال</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-slate-100">
                <td className="p-4 font-bold text-slate-900">{student.fullName}</td>
                <td className="p-4 text-slate-500">{student.nationalId || "—"}</td>
                <td className="p-4 text-slate-500">
                  {student.gender === "FEMALE"
                    ? "طالبة"
                    : student.gender === "MALE"
                      ? "طالب"
                      : "غير محدد"}
                </td>
                <td className="p-4 text-slate-500">{student.stage || "—"}</td>
                <td className="p-4 text-slate-500">{student.grade || "—"}</td>
                <td className="p-4 text-slate-500">{student.classroom || "—"}</td>
                <td className="p-4 text-slate-500">{student.guardian?.name || "—"}</td>
                <td className="p-4 text-slate-500">{student.guardian?.phone || "—"}</td>
              </tr>
            ))}

            {students.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400">
                  لم يتم رفع بيانات الطلاب بعد.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}