export type DocumentValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

export type DocumentFieldItem = {
  id: string;
  label: string;
  value: DocumentValue;
  helperText?: string;
};

export type DocumentTableColumn = {
  key: string;
  label: string;
};

export type DocumentTableRow =
  Record<string, DocumentValue>;

export type DocumentAttachment = {
  id: string;
  title?: string;
  url: string;
  mimeType?: string;
  caption?: string;
};

export type DocumentSignature = {
  id: string;
  role: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  signedAt?: string;
};

export type DocumentBlock =
  | {
      id: string;
      type: "text";
      title?: string;
      text: string;
    }
  | {
      id: string;
      type: "fields";
      title?: string;
      items: DocumentFieldItem[];
    }
  | {
      id: string;
      type: "list";
      title?: string;
      items: string[];
    }
  | {
      id: string;
      type: "table";
      title?: string;
      columns: DocumentTableColumn[];
      rows: DocumentTableRow[];
    }
  | {
      id: string;
      type: "image";
      title?: string;
      src: string;
      alt?: string;
      caption?: string;
    }
  | {
      id: string;
      type: "gallery";
      title?: string;
      items: DocumentAttachment[];
    }
  | {
      id: string;
      type: "summary";
      title?: string;
      text: string;
    }
  | {
      id: string;
      type: "custom";
      rendererKey: string;
      data: unknown;
    };

export type DocumentSection = {
  id: string;
  title?: string;
  description?: string;
  blocks: DocumentBlock[];
};

export type DocumentHeaderModel = {
  title?: string;
  subtitle?: string;
  organizationName?: string;
  logoUrl?: string;
  meta?: string[];
};

export type DocumentFooterModel = {
  text?: string;
  secondaryText?: string;
};

export type DocumentModel = {
  id: string;
  type: string;
  title: string;

  direction?: "rtl" | "ltr";

  header?: DocumentHeaderModel;
  footer?: DocumentFooterModel;

  sections: DocumentSection[];

  signatures?: DocumentSignature[];
  attachments?: DocumentAttachment[];

  metadata?: Record<string, unknown>;
};