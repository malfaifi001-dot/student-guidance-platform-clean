# ADR-003: توجيه اللوحات منشور في الجذر (لا `app/(dashboard)`)

- **الحالة**: مقبول
- **التاريخ**: موثّق من بنية `app/`

## القرار
لا يوجد مجلد Route Group باسم `(dashboard)`. جميع صفحات اللوحات في `app/dashboard/*` مباشرة، وجميع الـ API في `app/api/*` مباشرة.

## السياق
- `app/` يحتوي على مجلدات منشورة: `dashboard`, `api`, `login`, `register`, `mobile`, `teacher`, `survey`, `pricing`, `print`, `report-2-export-preview`, `pdf-preview` وغيرها.
- لا يوجد `app/(dashboard)/` في شجرة المجلدات.

## العواقب
- **إيجابية**: مسارات URL واضحة ومباشرة (`/dashboard/...`).
- **سلبية**: لا يوجد layout واحد مشترك لجميع اللوحات عبر Route Group — التخطيط المشترك يُدار عبر `components/layout/dashboard-sidebar.tsx` يدويًا.
