const fs = require("fs");

const path = "app/dashboard/onboarding/page.tsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("searchParams")) {
  content = content.replace(
`export default function OnboardingPage() {`,
`export default function OnboardingPage() {`
  );
}

content = content.replace(
`            هذه البيانات ستستخدم لاحقًا في التقارير الرسمية، هوية المدرسة، وملفات PDF.
            يمكنك تخطي هذه الخطوة الآن، لكن سيتم طلبها لاحقًا قبل استخدام التقارير الرسمية ورفع بيانات نور.`,
`            هذه البيانات ستستخدم لاحقًا في التقارير الرسمية، هوية المدرسة، وملفات PDF.
            يمكنك تخطي هذه الخطوة الآن، لكن سيتم طلبها لاحقًا قبل استخدام التقارير الرسمية ورفع بيانات نور.
            كلما كانت البيانات مكتملة، ظهرت التقارير الرسمية بشكل احترافي دون تعبئة يدوية متكررة.`
);

fs.writeFileSync(path, content, "utf8");

console.log("تم تحسين نص صفحة onboarding.");
