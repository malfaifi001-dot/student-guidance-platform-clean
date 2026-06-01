# نقطة توقف المشروع

التاريخ: بعد رفع نسخة GitHub الأخيرة

## آخر نسخة مرفوعة
Repository:
https://github.com/malfaifi001-dot/student-guidance-platform-clean.git

آخر Commit:
ad1de61
Add guardian summons workflow foundation and workflowType support

## أين وصلنا؟

بدأنا إضافة خدمة:
استدعاء ولي أمر

كمسار فرعي داخل خدمة:
التواصل بين الأسرة والمدرسة

وليس كصفحة ثابتة مستقلة.

## الفكرة المعمارية المعتمدة

Service:
family-school-communication

Workflow Type:
guardian-summons

المطلوب النهائي:
الأدمن يرفع Workflow Excel
ثم Preview
ثم Publish
ثم تظهر الخدمة للموجه/الموجهة في الداشبورد
ثم يفتح Runtime الحقيقي
ثم يحفظ CaseEntry / CaseValue
ثم لاحقًا يطبع خطاب استدعاء ولي أمر رسمي مختصر مثل الصورة.

## ما تم عمله

1. إضافة workflowType إلى Prisma Workflow.
2. إصلاح schema.prisma بعد خطأ إدراج index في مكان غلط.
3. تحديث قاعدة SQLite حتى تتعرف على workflowType.
4. نجاح build بعد الإصلاح.
5. تجهيز فكرة Workflow فرعي باسم guardian-summons.
6. تجهيز API seed/button مؤقت:
   /api/admin/workflows/guardian-summons

7. تجهيز نموذج Excel:
   guardian-summons-workflow-template.xlsx

## الوضع الحالي

- لا يوجد حتى الآن Upload Excel حقيقي للـ Workflow.
- النشر الحالي يتم من زر/Seed API وليس من Excel.
- الكرت/الأيقونة لم تظهر بشكل مؤكد في:
  /dashboard/admin/workflows
  /dashboard

## الخطوة القادمة الصحيحة

نكمل من:
بناء صفحة رفع Excel حقيقية للـ Workflow

المسار المقترح:
app/dashboard/admin/workflows/family-school-communication/page.tsx

ومعه API:
app/api/admin/workflows/upload/route.ts

الصفحة يجب أن تدعم:
1. اختيار الخدمة: family-school-communication
2. اختيار نوع النموذج: guardian-summons
3. رفع Excel
4. Preview
5. Publish
6. ظهور الكرت في داشبورد الموجه
7. فتح:
   /dashboard/family-school-communication/guardian-summons/new

## جملة الرجوع

نكمل استدعاء ولي أمر من رفع Excel للـ Workflow
