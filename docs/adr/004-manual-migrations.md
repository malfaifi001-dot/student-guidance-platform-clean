# ADR-004: هجرات يدوية — ممنوع `db push`/`migrate reset`/`migrate dev`

- **الحالة**: مقبول
- **التاريخ**: موثّق من `docs/MYSQL_MIGRATIONS_WORKFLOW.md` وقواعد العمل

## القرار
لا تشغّل أوامر الهجرة التلقائية:
- `prisma db push`
- `prisma migrate reset`
- `prisma migrate dev`

أي تغيير على `prisma/schema.prisma` يُنفَّذ كهجرة يدوية موثقة وفق `docs/MYSQL_MIGRATIONS_WORKFLOW.md`.

## السياق
- المشروع في إنتاج حي (Hostinger/MySQL)؛ الأوامر التلقائية قد تمسح بيانات أو تفرض إنشاءات غير مرغوبة.
- لا يوجد مجلد `prisma/migrations` في المستودع — الهجرات تُدار خارج التتبع.

## العواقب
- **إيجابية**: حماية البيانات الحية والتحكم الكامل في تغييرات المخطط.
- **سلبية**: يتطلب معرفة SQL/MySQL يدويًا وتوثيقًا دقيقًا عند كل تغيير schema.
