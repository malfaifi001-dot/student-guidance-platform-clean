import type {
  DocumentDataAdapter,
} from "@/lib/document-engine/document-data-adapter";

import type {
  DocumentModel,
} from "@/lib/document-engine/document-types";

export type CurriculumDistributionDocumentSource = {
  id: string;

  title?: string;

  schoolName?: string;
  teacherName?: string;
  subjectName?: string;
  gradeName?: string;
  semesterName?: string;
  academicYear?: string;

  rows: Array<{
    id: string;
    week: string;
    unit?: string;
    lesson?: string;
    notes?: string;
  }>;

  signature?: {
    id: string;
    name?: string;
    title?: string;
    imageUrl?: string;
  };
};

export const curriculumDistributionDocumentAdapter:
  DocumentDataAdapter<CurriculumDistributionDocumentSource> = {
  documentType: "curriculum-distribution",

  toDocumentModel(
    source,
  ): DocumentModel {
    return {
      id: source.id,
      type: "curriculum-distribution",
      title:
        source.title ??
        "توزيع المنهج",

      direction: "rtl",

      header: {
        title:
          source.title ??
          "توزيع المنهج",

        organizationName:
          source.schoolName,

        subtitle: [
          source.subjectName,
          source.gradeName,
        ]
          .filter(Boolean)
          .join(" — "),

        meta: [
          source.teacherName
            ? `المعلم: ${source.teacherName}`
            : null,

          source.semesterName
            ? `الفصل: ${source.semesterName}`
            : null,

          source.academicYear
            ? `العام الدراسي: ${source.academicYear}`
            : null,
        ].filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
      },

      sections: [
        {
          id: "distribution-table",

          title:
            "خطة توزيع المحتوى",

          description:
            "عرض منظم للأسابيع والوحدات والدروس والملاحظات.",

          blocks: [
            {
              id: "distribution-table-block",

              type: "table",

              columns: [
                {
                  key: "week",
                  label: "الأسبوع",
                },
                {
                  key: "unit",
                  label: "الوحدة",
                },
                {
                  key: "lesson",
                  label: "الدرس",
                },
                {
                  key: "notes",
                  label: "ملاحظات",
                },
              ],

              rows:
                source.rows.map(
                  (row) => ({
                    week:
                      row.week,
                    unit:
                      row.unit ??
                      "—",
                    lesson:
                      row.lesson ??
                      "—",
                    notes:
                      row.notes ??
                      "—",
                  }),
                ),
            },
          ],
        },
      ],

      signatures:
        source.signature
          ? [
              {
                id:
                  source.signature.id,

                role:
                  source.signature.title ??
                  "المعلم",

                name:
                  source.signature.name,

                title:
                  source.signature.title,

                imageUrl:
                  source.signature.imageUrl,
              },
            ]
          : [],

      footer: {
        text:
          source.schoolName ??
          "",

        secondaryText:
          source.academicYear ??
          "",
      },

      metadata: {
        source:
          "curriculum-distribution",
      },
    };
  },
};