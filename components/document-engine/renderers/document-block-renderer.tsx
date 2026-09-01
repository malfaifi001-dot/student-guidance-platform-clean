import {
  getDocumentCustomBlockRenderer,
} from "./document-custom-block-registry";

import type {
  DocumentBlock,
  DocumentValue,
} from "@/lib/document-engine/document-types";

type DocumentBlockRendererProps = {
  block: DocumentBlock;
};

function renderValue(
  value: DocumentValue,
) {
  if (value === null) {
    return "—";
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map((item) =>
        typeof item === "object"
          ? JSON.stringify(item)
          : String(item),
      )
      .join("، ");
  }

  if (
    typeof value === "object"
  ) {
    return JSON.stringify(
      value,
    );
  }

  if (
    typeof value === "boolean"
  ) {
    return value ? "نعم" : "لا";
  }

  return String(value);
}

function BlockTitle({
  title,
}: {
  title?: string;
}) {
  if (!title) {
    return null;
  }

  return (
    <h3 className="mb-3 text-[15px] font-bold text-slate-900">
      {title}
    </h3>
  );
}

export function DocumentBlockRenderer({
  block,
}: DocumentBlockRendererProps) {
  switch (block.type) {
    case "text":
      return (
        <section
          className="break-inside-avoid"
          data-document-block="text"
        >
          <BlockTitle
            title={block.title}
          />

          <div className="whitespace-pre-wrap text-[13px] leading-7 text-slate-700">
            {block.text}
          </div>
        </section>
      );

    case "summary":
      return (
        <section
          className="break-inside-avoid rounded-xl border border-slate-200 bg-slate-50 p-4"
          data-document-block="summary"
        >
          <BlockTitle
            title={block.title}
          />

          <div className="whitespace-pre-wrap text-[13px] leading-7 text-slate-700">
            {block.text}
          </div>
        </section>
      );

    case "fields":
      return (
        <section
          className="break-inside-avoid"
          data-document-block="fields"
        >
          <BlockTitle
            title={block.title}
          />

          <div className="grid grid-cols-2 gap-3">
            {block.items.map(
              (item) => (
                <div
                  key={item.id}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="mb-1 text-[11px] font-bold text-slate-500">
                    {item.label}
                  </div>

                  <div className="break-words text-[13px] font-semibold leading-6 text-slate-900">
                    {renderValue(
                      item.value,
                    )}
                  </div>

                  {item.helperText ? (
                    <div className="mt-1 text-[10px] leading-5 text-slate-400">
                      {
                        item.helperText
                      }
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </section>
      );

    case "list":
      return (
        <section
          className="break-inside-avoid"
          data-document-block="list"
        >
          <BlockTitle
            title={block.title}
          />

          <ul className="space-y-2 text-[13px] leading-6 text-slate-700">
            {block.items.map(
              (item, index) => (
                <li
                  key={`${block.id}-${index}`}
                  className="flex gap-2"
                >
                  <span aria-hidden="true">
                    •
                  </span>

                  <span>
                    {item}
                  </span>
                </li>
              ),
            )}
          </ul>
        </section>
      );

    case "table":
      return (
        <section
          className="break-inside-avoid"
          data-document-block="table"
        >
          <BlockTitle
            title={block.title}
          />

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-right text-[11px]">
              <thead className="bg-slate-50">
                <tr>
                  {block.columns.map(
                    (column) => (
                      <th
                        key={
                          column.key
                        }
                        className="border-b border-slate-200 px-3 py-2 font-bold text-slate-700"
                      >
                        {
                          column.label
                        }
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {block.rows.map(
                  (row, rowIndex) => (
                    <tr
                      key={`${block.id}-row-${rowIndex}`}
                    >
                      {block.columns.map(
                        (
                          column,
                        ) => (
                          <td
                            key={`${rowIndex}-${column.key}`}
                            className="border-b border-slate-100 px-3 py-2 align-top text-slate-700 last:border-b-0"
                          >
                            {renderValue(
                              row[
                                column
                                  .key
                              ] ??
                                null,
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      );

    case "image":
      return (
        <section
          className="break-inside-avoid"
          data-document-block="image"
        >
          <BlockTitle
            title={block.title}
          />

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
            <img
              src={block.src}
              alt={
                block.alt ??
                block.title ??
                ""
              }
              className="mx-auto max-h-[110mm] max-w-full object-contain"
            />

            {block.caption ? (
              <figcaption className="mt-2 text-center text-[10px] leading-5 text-slate-500">
                {
                  block.caption
                }
              </figcaption>
            ) : null}
          </figure>
        </section>
      );

    case "gallery":
      return (
        <section
          className="break-inside-avoid"
          data-document-block="gallery"
        >
          <BlockTitle
            title={block.title}
          />

          <div className="grid grid-cols-2 gap-3">
            {block.items.map(
              (item) => (
                <figure
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2"
                >
                  <img
                    src={item.url}
                    alt={
                      item.title ??
                      item.caption ??
                      ""
                    }
                    className="mx-auto h-[55mm] w-full object-contain"
                  />

                  {item.caption ? (
                    <figcaption className="mt-2 text-center text-[10px] leading-5 text-slate-500">
                      {
                        item.caption
                      }
                    </figcaption>
                  ) : null}
                </figure>
              ),
            )}
          </div>
        </section>
      );

    case "custom": {
      const Renderer =
        getDocumentCustomBlockRenderer(
          block.rendererKey,
        );

      if (!Renderer) {
        return (
          <section
            className="rounded-xl border border-dashed border-slate-300 p-4 text-[12px] text-slate-500"
            data-document-block="custom-missing"
          >
            لا يوجد Renderer مسجل
            للمكون:
            {" "}
            {block.rendererKey}
          </section>
        );
      }

      return (
        <section
          data-document-block="custom"
        >
          <Renderer
            data={block.data}
          />
        </section>
      );
    }

    default:
      return null;
  }
}