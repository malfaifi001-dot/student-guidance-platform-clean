type FilterOption = {
  label: string;
  value: string;
};

type Props = {
  subject?: string;
  grade?: string;
  classroom?: string;
  semester?: string;
  subjects?: FilterOption[];
  grades?: FilterOption[];
  classrooms?: FilterOption[];
  semesters?: FilterOption[];
  onSubjectChange?: (value: string) => void;
  onGradeChange?: (value: string) => void;
  onClassroomChange?: (value: string) => void;
  onSemesterChange?: (value: string) => void;
};

export function ResultsAnalysisFilters({
  subject = "ALL",
  grade = "ALL",
  classroom = "ALL",
  semester = "ALL",
  subjects = [],
  grades = [],
  classrooms = [],
  semesters = [],
  onSubjectChange,
  onGradeChange,
  onClassroomChange,
  onSemesterChange,
}: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">فلاتر التحليل</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <FilterSelect
          label="المادة"
          value={subject}
          options={subjects}
          onChange={onSubjectChange}
        />

        <FilterSelect
          label="الصف"
          value={grade}
          options={grades}
          onChange={onGradeChange}
        />

        <FilterSelect
          label="الشعبة"
          value={classroom}
          options={classrooms}
          onChange={onClassroomChange}
        />

        <FilterSelect
          label="الفصل الدراسي"
          value={semester}
          options={semesters}
          onChange={onSemesterChange}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-400"
      >
        <option value="ALL">الكل</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}