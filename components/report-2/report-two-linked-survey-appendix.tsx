type Props = {
  htmlItems: string[];
};

export function ReportTwoLinkedSurveyAppendix({ htmlItems }: Props) {
  if (!htmlItems.length) return null;

  return (
    <section className="linked-survey-official-shell" dir="rtl">
      <style>{`
        .linked-survey-official-shell{
          width:100%;
          margin:0;
          padding:0 0 28px;
          background:transparent;
        }

        .linked-survey-preview-card{
          width:min(100%, 1120px);
          margin:24px auto 0;
          overflow:hidden;
          border-radius:2rem;
          border:1px solid #dbe3ea;
          background:#ffffff;
          box-shadow:0 2px 6px rgba(15,23,42,.06);
          padding:24px;
          page-break-before:always;
          break-before:page;
        }

        .linked-survey-card-head{
          margin-bottom:18px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
        }

        .linked-survey-card-title{
          margin:0;
          color:#081f47;
          font-size:20px;
          line-height:1.5;
          font-weight:900;
        }

        .linked-survey-card-subtitle{
          margin:4px 0 0;
          color:#64748b;
          font-size:13px;
          line-height:1.8;
          font-weight:800;
        }

        .linked-survey-card-badge{
          flex-shrink:0;
          border-radius:999px;
          background:#ecfeff;
          border:1px solid #cffafe;
          color:#0e7490;
          padding:10px 16px;
          font-size:12px;
          font-weight:900;
        }

        .linked-survey-official-page{
          width:297mm;
          height:210mm;
          max-width:100%;
          margin:0 auto;
          overflow:hidden;
          background:#ffffff;
          border:1px solid rgba(148,163,184,.35);
          box-shadow:0 18px 48px rgba(15,23,42,.12);
        }

        .linked-survey-official-frame{
          display:block;
          width:297mm;
          height:210mm;
          max-width:100%;
          border:0;
          background:#ffffff;
          transform-origin:top center;
        }

        @media screen and (max-width: 1200px){
          .linked-survey-preview-card{
            width:calc(100% - 32px);
            padding:18px;
          }

          .linked-survey-official-page{
            width:100%;
            aspect-ratio:297 / 210;
            height:auto;
          }

          .linked-survey-official-frame{
            width:100%;
            height:100%;
          }
        }

        @media print{
          .linked-survey-official-shell{
            background:#ffffff !important;
            margin:0 !important;
            padding:0 !important;
          }

          .linked-survey-preview-card{
            width:297mm !important;
            height:210mm !important;
            margin:0 !important;
            padding:0 !important;
            border:0 !important;
            border-radius:0 !important;
            box-shadow:none !important;
            background:#ffffff !important;
            overflow:hidden !important;
            page-break-before:always !important;
            break-before:page !important;
            page-break-after:always !important;
            break-after:page !important;
          }

          .linked-survey-card-head{
            display:none !important;
          }

          .linked-survey-official-page{
            width:297mm !important;
            height:210mm !important;
            max-width:297mm !important;
            margin:0 !important;
            border:0 !important;
            box-shadow:none !important;
            overflow:hidden !important;
          }

          .linked-survey-official-frame{
            width:297mm !important;
            height:210mm !important;
            max-width:297mm !important;
            border:0 !important;
          }
        }
      `}</style>

      {htmlItems.map((html, index) => (
        <article
          key={index}
          className="linked-survey-preview-card"
          aria-label={`ملحق تقرير استبيان ${index + 1}`}
        >
          <header className="linked-survey-card-head">
            <div>
              <h2 className="linked-survey-card-title">
                ملحق الاستبيان المرتبط بالتقرير
              </h2>
              <p className="linked-survey-card-subtitle">
                يظهر هذا الملحق كصفحة مستقلة بعد التقرير، بدون تعديل تصميم التقرير الأساسي.
              </p>
            </div>

            <span className="linked-survey-card-badge">
              استبيان {index + 1} من {htmlItems.length}
            </span>
          </header>

          <div className="linked-survey-official-page">
            <iframe
              title={`ملحق تقرير استبيان ${index + 1}`}
              className="linked-survey-official-frame"
              srcDoc={html}
            />
          </div>
        </article>
      ))}
    </section>
  );
}