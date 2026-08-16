export const TIMETABLE_V3_DAY_OPTIONS = [
  {
    id: "SUNDAY",
    label: "الأحد",
  },
  {
    id: "MONDAY",
    label: "الاثنين",
  },
  {
    id: "TUESDAY",
    label: "الثلاثاء",
  },
  {
    id: "WEDNESDAY",
    label: "الأربعاء",
  },
  {
    id: "THURSDAY",
    label: "الخميس",
  },
] as const;

export type TimetableV3DayId =
  (typeof TIMETABLE_V3_DAY_OPTIONS)[number]["id"];

export type TimetableV3Day = {
  id: TimetableV3DayId;
  label: string;
  order: number;
};

export type TimetableV3Period = {
  id: string;
  label: string;
  order: number;
  isBreak: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type TimetableV3TeacherInput = {
  name: string;
  specialty: string;
  maxWeeklyLoad: number;
};

export type TimetableV3SetupWorkspace = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
    stages: import("@/lib/timetable-v3/school-setup-catalog").TimetableV3StageId[];
  };

  days: TimetableV3Day[];

  periods: TimetableV3Period[];

  classes: Array<{
    id: string;
    name: string;
  }>;

  classMappings: import("@/lib/timetable-v3/school-setup-catalog").TimetableV3ClassMappings;

  subjects: Array<{
    id: string;
    name: string;
  }>;

  teachers: Array<{
    id: string;
    name: string;
    specialty: string;
    maxWeeklyLoad: number;
  }>;
};
