import type { GuidanceContextKey, GuidanceDefinition } from "@/lib/guidance/guidance-types";

export const GUIDANCE_REGISTRY: Record<GuidanceContextKey, GuidanceDefinition> = {
  "student-data-import": {
    context: "student-data-import",
    steps: [
      { id: "start", target: "student-import-start", title: "ابدأ من هنا", description: "اختر السنة والفصل، ثم انتقل إلى رفع ملف الطلاب." },
      { id: "steps", target: "student-import-steps", title: "ثلاث خطوات فقط", description: "ارفع الملف، راجع البيانات، ثم اعتمد التحديث." },
      { id: "records", target: "student-import-current-data", title: "بيانات الطلاب الحالية", description: "افتح أي بطاقة لمراجعة آخر تحديث أو إضافة ملف جديد." },
    ],
  },
  "service-overview": {
    context: "service-overview",
    steps: [
      { id: "create", target: "service-create", title: "ابدأ عنصرًا جديدًا", description: "استخدم الإجراء الرئيسي لبدء النموذج الخاص بهذه الخدمة." },
      { id: "secondary", target: "service-secondary-action", title: "إجراء إضافي", description: "يمكنك إرسال النشاط إلى معلم من داخل مجال النشاط الحالي.", allowedRoles: ["ACTIVITY_LEADER"], requiredCapability: "send-to-teacher" },
      { id: "records", target: "service-records", title: "راجع السجلات", description: "تابع العناصر السابقة وحالتها من هذا القسم." },
    ],
  },
  "workflow-runtime": {
    context: "workflow-runtime",
    steps: [
      { id: "step", target: "workflow-step", title: "خطوة العمل الحالية", description: "يوضح هذا الجزء موضعك داخل مسار العمل." },
      { id: "fields", target: "workflow-main-fields", title: "بيانات النموذج", description: "أكمل الحقول الظاهرة؛ وتتغير حسب الـWorkflow المنشور." },
      { id: "actions", target: "workflow-actions", title: "الحفظ والمتابعة", description: "احفظ المسودة أو انتقل للخطوة التالية ثم أرسل النموذج." },
    ],
  },
  "case-details": {
    context: "case-details",
    steps: [
      { id: "summary", target: "case-summary", title: "ملخص السجل", description: "راجع الحالة والبيانات الأساسية من هنا." },
      { id: "edit", target: "case-edit", title: "تحديث السجل", description: "عدّل البيانات عندما يكون هذا الإجراء متاحًا.", requiredCapability: "case-edit" },
      { id: "report", target: "case-report", title: "إصدار التقرير", description: "افتح مسار التقرير المرتبط بالسجل.", requiredCapability: "case-report" },
    ],
  },
  "report-prepare": {
    context: "report-prepare",
    steps: [
      { id: "fields", target: "report-prepare-fields", title: "محتوى التقرير", description: "اختر الحقول والمحتوى الذي سيظهر في التقرير." },
      { id: "description", target: "report-prepare-description", title: "صياغة الوصف", description: "راجع الوصف أو حسّنه قبل المتابعة." },
      { id: "continue", target: "report-prepare-continue", title: "الانتقال للمعاينة", description: "انتقل إلى مساحة المعاينة والتحرير بعد اكتمال الإعداد." },
    ],
  },
  "report-preview": {
    context: "report-preview",
    steps: [
      { id: "design", target: "report-preview-design", title: "تصميم التقرير", description: "بدّل التصميم عندما تكون خيارات التصميم متاحة." },
      { id: "document", target: "report-preview-document", title: "راجع التقرير", description: "تحقق من المحتوى والتنسيق قبل الاعتماد أو التنزيل." },
      { id: "actions", target: "report-preview-actions", title: "إجراءات التقرير", description: "تابع إلى التحرير أو الحفظ أو التنزيل حسب الحالة." },
    ],
  },
  calendar: {
    context: "calendar",
    steps: [
      { id: "create", target: "calendar-create", title: "إضافة تذكير", description: "أنشئ موعدًا أو تنبيهًا جديدًا من هنا." },
      { id: "filters", target: "calendar-filters", title: "تصفية المواعيد", description: "استخدم عوامل التصفية للوصول إلى المواعيد المطلوبة." },
      { id: "list", target: "calendar-list", title: "متابعة التذكيرات", description: "راجع المواعيد القادمة وحالتها في هذه القائمة." },
    ],
  },
  "report-studio": {
    context: "report-studio",
    steps: [
      { id: "identity", target: "studio-template-identity", title: "هوية القالب", description: "راجع القالب والتصميم المستخدم للتقرير." },
      { id: "design", target: "studio-design-controls", title: "أدوات التصميم", description: "اضبط مظهر التقرير وإعدادات التصميم." },
      { id: "pages", target: "studio-page-settings", title: "إعدادات الصفحات", description: "نظّم الصفحات ومقاساتها وترتيبها." },
      { id: "header", target: "studio-report-header", title: "رأس التقرير والشعار", description: "تحكم في بيانات الرأس والشعار المتاحين." },
      { id: "blocks", target: "studio-content-blocks", title: "كتل المحتوى", description: "اختر الكتلة المطلوبة وعدّل محتواها." },
      { id: "canvas", target: "studio-report-canvas", title: "معاينة التقرير", description: "تابع أثر التعديلات مباشرة على مساحة التقرير." },
      { id: "autosave", target: "studio-autosave", title: "الحفظ التلقائي", description: "تُحفظ تعديلاتك تلقائيًا، ويمكن الرجوع عن آخر تعديل." },
      { id: "save", target: "studio-save-now", title: "حفظ الآن", description: "احفظ النسخة الحالية يدويًا عند الحاجة." },
      { id: "finalize", target: "studio-finalize", title: "الاعتماد النهائي", description: "نفّذ الفحص النهائي ثم اعتمد التقرير عندما يصبح جاهزًا." },
    ],
  },
};
