const fs = require("fs");

/* 1) إصلاح uncontrolled input في SchoolSettingsForm */
const formPath = "components/settings/school-settings-form.tsx";
let form = fs.readFileSync(formPath, "utf8");

/*
  نخلي أي بيانات راجعة من API تمر على normalize
  حتى لا يدخل undefined داخل value للـ input.
*/
if (!form.includes("function normalizeSchoolSettingsData")) {
  form = form.replace(
`const EMPTY_FORM: SchoolSettingsFormState = {`,
`function normalizeSchoolSettingsData(data: Partial<SchoolSettingsFormState> | null | undefined): SchoolSettingsFormState {
  return {
    officialName: data?.officialName || "",
    jobTitle: data?.jobTitle || "",
    phone: data?.phone || "",
    schoolName: data?.schoolName || "",
    principalName: data?.principalName || "",
    educationDepartment: data?.educationDepartment || "",
    educationOffice: data?.educationOffice || "",
    city: data?.city || "",
    district: data?.district || "",
    stage: data?.stage || "",
    academicYear: data?.academicYear || "",
    currentSemester: data?.currentSemester || "",
    logoUrl: data?.logoUrl || "",
    onboardingCompleted: Boolean(data?.onboardingCompleted),
  };
}

const EMPTY_FORM: SchoolSettingsFormState = {`
  );
}

form = form.replace(
`          setForm(data.data);
          setInitialForm(data.data);`,
`          const normalizedData = normalizeSchoolSettingsData(data.data);
          setForm(normalizedData);
          setInitialForm(normalizedData);`
);

/*
  احتياط إضافي: أي input يستقبل value غير مضمون نحوله string.
*/
form = form.replace(
`        value={value}`,
`        value={value || ""}`
);

fs.writeFileSync(formPath, form, "utf8");


/* 2) إصلاح Runtime identity: استخدم schoolLogoUrl بدل logoUrl */
const identityPath = "lib/report-engine/report-identity-runtime.ts";
let identity = fs.readFileSync(identityPath, "utf8");

identity = identity.replace(
`    logoUrl: profile?.logoUrl || "",`,
`    schoolLogoUrl: profile?.logoUrl || "",`
);

fs.writeFileSync(identityPath, identity, "utf8");


/* 3) إصلاح PDF renderer: identity.schoolLogoUrl بدل identity.logoUrl */
const rendererPath = "components/report-engine/report-builder-pdf-renderer.tsx";
let renderer = fs.readFileSync(rendererPath, "utf8");

renderer = renderer.replaceAll("identity.logoUrl", "identity.schoolLogoUrl");

fs.writeFileSync(rendererPath, renderer, "utf8");


/* 4) تأكد أن API settings يرجع logoUrl دائمًا */
const apiPath = "app/api/dashboard/settings/school/route.ts";
let api = fs.readFileSync(apiPath, "utf8");

if (!api.includes("logoUrl: profile?.logoUrl")) {
  api = api.replace(
`      currentSemester: profile?.currentSemester || "",`,
`      currentSemester: profile?.currentSemester || "",
      logoUrl: profile?.logoUrl || "",`
  );
}

fs.writeFileSync(apiPath, api, "utf8");

console.log("تم إصلاح school logo type و uncontrolled inputs.");
