# ADR-001: قاعدة بيانات MySQL فقط

- **الحالة**: مقبول
- **التاريخ**: موثّق من الكود الفعلي

## القرار
يجب أن يبقى `prisma/schema.prisma` مع `datasource db { provider = "mysql" }` دون تغيير. ممنوع تحويل المشروع إلى SQLite أو أي مزوّد آخر.

## السياق
- `prisma/schema.prisma` يحدد `provider = "mysql"` (سطر datasource).
- يوجد ملف `dev.db` في الجذر (بقايا SQLite قديمة) وقد يضلل — **ليس** قاعدة البيانات النشطة.
- قاعدة الإنتاج: MySQL/MariaDB، مع `mariadb` كعميل في `package.json`.

## العواقب
- **إيجابية**: استقرار مع بُنى JSON وأعمدة Text كبيرة (لقطات سير العمل والتقارير).
- **سلبية**: لا يمكن تشغيل محليًا بـSQLite بسرعة؛ أي بيان SQL يجب أن يكون MySQL-compatible.
