type RuntimeField = {
  key: string;
  isRequired?: boolean;
};

type RuntimeStep = {
  id: string;
  title: string;
  fields: RuntimeField[];
};

export function calculateRuntimeProgress(params: {
  steps: RuntimeStep[];
  values: Record<string, unknown>;
}) {
  const { steps, values } = params;

  let totalRequired = 0;
  let completedRequired = 0;

  const stepsProgress = steps.map((step) => {
    const requiredFields = step.fields.filter(
      (field) => field.isRequired
    );

    const completed = requiredFields.filter((field) => {
      const value = values[field.key];

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined && value !== null && value !== "";
    });

    totalRequired += requiredFields.length;
    completedRequired += completed.length;

    const percent =
      requiredFields.length === 0
        ? 100
        : Math.round(
            (completed.length / requiredFields.length) * 100
          );

    return {
      stepId: step.id,
      title: step.title,
      completed: completed.length,
      total: requiredFields.length,
      percent,
      isCompleted: percent === 100,
    };
  });

  const overallPercent =
    totalRequired === 0
      ? 100
      : Math.round(
          (completedRequired / totalRequired) * 100
        );

  return {
    overallPercent,
    totalRequired,
    completedRequired,
    stepsProgress,
  };
}