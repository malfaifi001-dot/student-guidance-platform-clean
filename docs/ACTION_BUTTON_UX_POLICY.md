# Action Button UX Policy

General Rule

Any action button in the platform must show clear feedback to the user.

Do not use:
- alert()
- confirm()
- window.alert()
- window.confirm()

Use centralized UI components instead.

Normal Actions

For normal actions:
1. Run the action.
2. Show a result popup after completion.
3. The result popup should explain whether the action succeeded or failed.

Sensitive Actions

Sensitive actions must not run directly.

Examples:
- Delete
- Disable
- Activate
- Cancel subscription
- Change permissions
- Publish workflow
- Approve report
- Payment
- Archive
- Approve bank transfer
- Reject bank transfer
- Cancel invoice
- Refund payment

Required flow:
1. Show confirmation popup before execution.
2. Explain the impact of the action.
3. Run the action only after confirmation.
4. Show a result popup after execution.

API Error Response

For sensitive or multi-step APIs, error responses should include:
- error
- details
- step

Approved Component

Use:
components/ui/smart-action-feedback.tsx

Expected hook:
useSmartActionFeedback()

Required modal:
SmartActionFeedbackModal

Sensitive Action Example

confirmAction({
  title: "Confirm action",
  description: "This action will affect important data.",
  variant: "warning",
  confirmLabel: "Confirm",
  run: executeAction,
  successTitle: "Action completed",
  successDescription: "The action was completed successfully.",
  errorTitle: "Action failed",
});

Normal Feedback Example

showFeedback({
  title: "Saved",
  description: "Changes were saved successfully.",
  variant: "success",
});