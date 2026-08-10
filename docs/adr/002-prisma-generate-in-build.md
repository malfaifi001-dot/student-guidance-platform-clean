# ADR-002: `prisma generate` إلزامي في `build` و`postinstall`

- **الحالة**: مقبول
- **التاريخ**: موثّق من `package.json`

## القرار
سكريبتات `npm`:
- `build` = `prisma generate && next build`
- `postinstall` = `prisma generate`

يجب ألا تُحذف `prisma generate` من أيٍّ من السكريبتين، وأي تغيير لهما يتطلب مراجعة.

## السياق
- `package.json` يُظهر هذه السكريبتات صراحةً.
- `@prisma/client` 7.8.0 يتطلب توليد العميل بعد تغيير الـ schema.
- `postinstall` يضمن تجهيز العميل بعد `npm install` (مهم للبيئات الجديدة).

## العواقب
- **إيجابية**: عميل Prisma محدّث دائمًا قبل البناء.
- **سلبية**: البناء أبطأ قليلًا؛ بيئات بدون اتصال بـMySQL ما زالت تُولّد العميل بنجاح (لا يحتاج اتصالًا).
