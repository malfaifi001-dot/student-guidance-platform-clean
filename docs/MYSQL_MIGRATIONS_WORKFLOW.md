# MySQL / Prisma Migration Workflow

المشروع يستخدم MySQL/MariaDB فقط.

قاعدة التطوير المحلية:
container: student-guidance-mariadb-local
database: student_guidance_local
host: 127.0.0.1
port: 3307

ممنوع:
- prisma db push
- prisma db push --force-reset
- prisma migrate reset
- حذف بيانات قاعدة Docker
- إضافة migrations SQLite

baseline الحالي:
20260607214544_mysql_baseline_current_schema

عند تعديل schema.prisma مستقبلًا:
docker start student-guidance-mariadb-local
npx prisma migrate dev --name اسم_التعديل
npx prisma generate
npm run build

في الإنتاج:
npx prisma migrate deploy
npx prisma generate
npm run build

إذا كانت قاعدة الإنتاج فيها الجداول موجودة مسبقًا، نفذ مرة واحدة فقط:
npx prisma migrate resolve --applied 20260607214544_mysql_baseline_current_schema
npx prisma migrate deploy

بعد ذلك أي نشر جديد يستخدم migrate deploy فقط.