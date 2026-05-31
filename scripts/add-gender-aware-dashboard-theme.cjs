const fs = require("fs");

const path = "components/dashboard/soft-blue-dashboard.tsx";
let content = fs.readFileSync(path, "utf8");

/*
  نضيف theme ديناميكي حسب موجه/موجهة
*/
if (!content.includes("function getDashboardTheme")) {
  content = content.replace(
`function getIdentityScore(user: SoftBlueDashboardProps["user"]) {`,
`function getDashboardTheme(gender?: string | null) {
  const isFemale = gender === "FEMALE";

  if (isFemale) {
    return {
      heroGradient: "from-rose-50 via-white to-fuchsia-50",
      heroBorder: "border-rose-100",
      primaryText: "text-rose-700",
      primaryButton: "bg-rose-500 hover:bg-rose-600 shadow-rose-100",
      secondaryButton:
        "border-rose-100 bg-white text-rose-700 hover:bg-rose-50",
      badge: "bg-white/80 text-rose-600",
      icon: "text-rose-500",
      focus:
        "focus:border-rose-200 focus:ring-4 focus:ring-rose-50",
      serviceLink: "text-rose-600 hover:text-rose-700",
      reminderGradient: "from-rose-50 via-white to-fuchsia-50",
      reminderText: "text-rose-700",
      reminderButton: "text-rose-700 hover:bg-rose-50",
      marketingGradient: "from-rose-500 to-fuchsia-500",
      quickIcon: "text-rose-600",
      quickHover: "group-hover:text-rose-600",
      progress: "from-rose-300 to-fuchsia-500",
      avatarFallback: "/uploads/VD/girl.png",
      label: "موجهة طلابية",
    };
  }

  return {
    heroGradient: "from-sky-50 via-white to-blue-50",
    heroBorder: "border-sky-100",
    primaryText: "text-sky-700",
    primaryButton: "bg-sky-600 hover:bg-sky-700 shadow-sky-100",
    secondaryButton:
      "border-sky-100 bg-white text-sky-700 hover:bg-sky-50",
    badge: "bg-white/80 text-sky-600",
    icon: "text-sky-500",
    focus:
      "focus:border-sky-200 focus:ring-4 focus:ring-sky-50",
    serviceLink: "text-sky-600 hover:text-sky-700",
    reminderGradient: "from-cyan-50 via-white to-blue-50",
    reminderText: "text-sky-700",
    reminderButton: "text-sky-700 hover:bg-sky-50",
    marketingGradient: "from-sky-600 to-cyan-500",
    quickIcon: "text-sky-600",
    quickHover: "group-hover:text-sky-600",
    progress: "from-cyan-300 to-blue-500",
    avatarFallback: "/uploads/VD/boy.png",
    label: "موجه طلابي",
  };
}

function getIdentityScore(user: SoftBlueDashboardProps["user"]) {`
  );
}

/*
  بعد تعريف counselorImage نضيف theme
*/
content = content.replace(
`  const counselorImage =
    user.gender === "FEMALE" ? "/uploads/VD/girl.png" : "/uploads/VD/boy.png";`,
`  const theme = getDashboardTheme(user.gender);
  const counselorImage = theme.avatarFallback;`
);

/*
  البحث
*/
content = content.replace(
`focus:border-sky-200 focus:ring-4 focus:ring-sky-50`,
`${'${theme.focus}'}`
);

/*
  Hero gradient and border
*/
content = content.replace(
`border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50`,
`border ${'${theme.heroBorder}'} bg-gradient-to-br ${'${theme.heroGradient}'}`
);

/*
  badge color
*/
content = content.replace(
`bg-white/80 px-4 py-2 text-xs font-black text-sky-600`,
`px-4 py-2 text-xs font-black ${'${theme.badge}'}`
);

/*
  main greeting color
*/
content = content.replace(
`text-3xl font-black tracking-tight text-sky-700 md:text-5xl`,
`text-3xl font-black tracking-tight ${'${theme.primaryText}'} md:text-5xl`
);

/*
  icon colors in hero details
*/
content = content.replaceAll(`text-sky-500`, `${'${theme.icon}'}`);

/*
  buttons
*/
content = content.replace(
`rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700`,
`rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition ${'${theme.primaryButton}'}`
);

content = content.replace(
`rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-50`,
`rounded-2xl border px-5 py-3 text-sm font-black transition ${'${theme.secondaryButton}'}`
);

/*
  service links
*/
content = content.replaceAll(
`text-sky-600 hover:text-sky-700`,
`${'${theme.serviceLink}'}`
);

/*
  reminder card gradient
*/
content = content.replace(
`border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50`,
`border border-slate-100 bg-gradient-to-br ${'${theme.reminderGradient}'}`
);

content = content.replace(
`text-sky-700`,
`${'${theme.reminderText}'}`
);

/*
  marketing box gradient
*/
content = content.replace(
`bg-gradient-to-br from-sky-600 to-cyan-500`,
`bg-gradient-to-br ${'${theme.marketingGradient}'}`
);

/*
  role label fallback
*/
content = content.replace(
`user.jobTitle || (user.gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي");`,
`user.jobTitle || theme.label;`
);

/*
  Add soft feminine note in hero if female
*/
if (!content.includes("رسالتك اليوم")) {
  content = content.replace(
`                <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">`,
`                {user.gender === "FEMALE" ? (
                  <div className="mt-5 inline-flex rounded-2xl border border-rose-100 bg-white/70 px-4 py-3 text-sm font-bold leading-7 text-rose-700 shadow-sm">
                    رسالتك اليوم: كل متابعة صغيرة تصنع فرقًا كبيرًا في حياة طالبة.
                  </div>
                ) : (
                  <div className="mt-5 inline-flex rounded-2xl border border-sky-100 bg-white/70 px-4 py-3 text-sm font-bold leading-7 text-sky-700 shadow-sm">
                    رسالتك اليوم: كل متابعة صغيرة تصنع فرقًا كبيرًا في حياة طالب.
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تم تفعيل ثيم الموجه/الموجهة وربط boy/girl بصريًا.");
