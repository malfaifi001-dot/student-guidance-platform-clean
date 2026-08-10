# وحدة التقارير — Reports Module

## الغرض
بناء تقارير إرشادية من الحالات، قوالب، لقطات، اعتماد، تصدير/طباعة.

## النظام الحي: report-2 + report-engine

| الطبقة | الملفات |
|---|---|
| منطق التقرير | `lib/report-2/` (snapshot-service, structured-data, sync-from-case, linked attachments) |
| العارض الحديث | `lib/report-engine/` (block builder, smart-text, physical-layout, design-renderers في components) |
| الاستوديو | `components/report-2/report-two-studio-runtime.tsx` |
| واجهات | `app/dashboard/report-2/{home, cases/[caseId]/prepare, cases/[caseId]/studio, snapshots/[snapshotId]/preview}` |
| API | `app/api/dashboard/report-2/*` (save, approve, export/pdf, snapshots) |

## القوالب — `ReportTemplate`
- `SYSTEM|SCHOOL|PERSONAL`؛ `templateJson` (pages→blocks).
- واجهة مصمم: `app/dashboard/admin/report-templates`.
- API: `app/api/dashboard/report-templates/*`.

## الأنظمة القديمة/الموازية

| النظام | الحالة |
|---|---|
| `report-1`/`GuidanceReport` | قديم، ما زال يعمل (يكتب `GuidanceReport`) |
| `reports/*` API | شبه مهجور؛ الصفحات الرئيسية تحوّل إلى report-2 |
| `report-engine-legacy` + `reports-legacy` | كود ميت (H6) |
| `custom-report` | تقارير مخصصة AI (نموذج `CustomReportTemplate`) |
| `statistics` | تقارير إحصائية (`StatisticalReport`) |

## مسارات API (الملخص)
- `report-2/cases/[caseId]/{save,approve,export/pdf}` + `report-2/snapshots/*`.
- `report-templates/{route,[templateId],use}`.
- `reports/*` و`report-1/*` — نظام GuidanceReport القديم.
- `custom-report/{entries,suggest,templates}`.
- `statistics/{description,generate,prepare,reports,services}`.
- `special-report/{ai,runtime,fields,templates}`.

## التصدير
- report-2: طباعة المتصفح عبر `.tmp/report-2-export/{token}.json`.
- GuidanceReport/إنفويسات/شهادات: Playwright/Puppeteer.
- Excel: exceljs؛ CSV: xlsx.

## نقاط للتنبه
- ثلاثة مسارات عرض (structured/snapshotHtml/legacy) (M8/H6).
- كود اعتماد مكرر لا يُنفَّذ (M9).
- نظاما ترقيم (L7).
- التفاصيل في `flows/reports.md`.
