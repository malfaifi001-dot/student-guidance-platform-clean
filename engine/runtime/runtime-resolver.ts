export type RuntimeOption = {
  id: string;
  label: string;
  value: string;
  order: number;
  linkedToValue?: string | null;
};

export type RuntimeField = {
  id: string;
  key: string;
  label: string;
  type: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  dependsOnFieldKey?: string | null;
  linkedToValue?: string | null;
  allowOther: boolean;
  options: RuntimeOption[];
};

export type RuntimeStep = {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  fields: RuntimeField[];
};

export type RuntimeWorkflow = {
  id: string;
  name: string;
  serviceSlug: string;
  steps: RuntimeStep[];
};

export function sortRuntimeWorkflow(workflow: RuntimeWorkflow): RuntimeWorkflow {
  return {
    ...workflow,
    steps: [...workflow.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        ...step,
        fields: [...step.fields].sort((a, b) => a.order - b.order),
      })),
  };
}