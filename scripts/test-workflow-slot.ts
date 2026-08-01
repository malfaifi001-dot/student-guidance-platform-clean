import assert from "node:assert/strict";

import {
  getWorkflowActivationSlot,
  getWorkflowSlotTypeAliases,
  normalizeWorkflowActivationType,
} from "../lib/workflows/workflow-slot";

assert.equal(normalizeWorkflowActivationType("default"), "service-main");
assert.equal(normalizeWorkflowActivationType("service-main"), "service-main");
assert.equal(normalizeWorkflowActivationType("guardian-summons"), "guardian-summons");
assert.deepEqual(getWorkflowSlotTypeAliases("default"), ["service-main", "default"]);
assert.equal(
  getWorkflowActivationSlot({ serviceId: "service-a", workflowType: "default" }),
  getWorkflowActivationSlot({ serviceId: "service-a", workflowType: "service-main" }),
);
assert.notEqual(
  getWorkflowActivationSlot({ serviceId: "service-a", workflowType: "service-main" }),
  getWorkflowActivationSlot({ serviceId: "service-a", workflowType: "guardian-summons" }),
);
assert.notEqual(
  getWorkflowActivationSlot({ serviceId: "service-a", workflowType: "service-main" }),
  getWorkflowActivationSlot({ serviceId: "service-b", workflowType: "service-main" }),
);

console.log("Workflow slot tests passed.");
