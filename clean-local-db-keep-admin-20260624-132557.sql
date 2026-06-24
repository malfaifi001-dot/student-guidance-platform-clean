SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM ActivationCode;
DELETE FROM ActivityAssignment;
DELETE FROM ApiCredential;
DELETE FROM AssessmentAnalysis;
DELETE FROM AssessmentInterventionRule;
DELETE FROM AssessmentInterventionWorkflowTarget;
DELETE FROM BankTransferRequest;
DELETE FROM CalendarReminder;
DELETE FROM CaseEntry;
DELETE FROM CaseEvidence;
DELETE FROM CaseValue;
DELETE FROM CertificateBatch;
DELETE FROM CertificateTemplate;
DELETE FROM CreditNote;
DELETE FROM CustomReportEntry;
DELETE FROM CustomReportTemplate;
DELETE FROM DynamicField;
DELETE FROM DynamicFieldOption;
DELETE FROM Evidence;
DELETE FROM ExportTemplate;
DELETE FROM ExternalSyncLog;
DELETE FROM FeatureFlag;
DELETE FROM Guardian;
DELETE FROM GuidanceReport;
DELETE FROM IntegrationProvider;
DELETE FROM Invoice;
DELETE FROM InvoiceNumberSequence;
DELETE FROM InvoiceSettings;
DELETE FROM IssuedCertificate;
DELETE FROM ManualActivation;
DELETE FROM NoorImportCycle;
DELETE FROM PaymentProvider;
DELETE FROM PaymentTransaction;
DELETE FROM Plan;
DELETE FROM PlanFeature;
DELETE FROM PlatformActivityLog;
DELETE FROM ReportEvidence;
DELETE FROM ReportSnapshot;
DELETE FROM ReportTemplate;
DELETE FROM ResultsAnalysis;
DELETE FROM SchoolAccount;
DELETE FROM SchoolProfile;
DELETE FROM Service;
DELETE FROM ServiceAccess;
DELETE FROM SmartReportImport;
DELETE FROM StaffMember;
DELETE FROM Student;
DELETE FROM StudentImportChange;
DELETE FROM StudentImportFile;
DELETE FROM StudentImportRow;
DELETE FROM StudentImportSession;
DELETE FROM Subscription;
DELETE FROM Survey;
DELETE FROM SurveyAnswer;
DELETE FROM SurveyOption;
DELETE FROM SurveyQuestion;
DELETE FROM SurveyResponse;
DELETE FROM UsageLimit;
DELETE FROM UsageRecord;
DELETE FROM UserSession;
DELETE FROM WebhookEvent;
DELETE FROM Workflow;
DELETE FROM WorkflowStep;

DELETE FROM User WHERE email <> 'admin@local.test';

UPDATE User
SET role = 'ADMIN',
    name = 'Local Admin',
    schoolAccountId = NULL
WHERE email = 'admin@local.test';

SET FOREIGN_KEY_CHECKS = 1;