"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { calculateSchoolIdentityReadiness } from "@/lib/school-identity-readiness";
import {
  getArabicSignatureTitle,
  getArabicUserRoleIdentityCopy,
  getArabicUserRoleLabel,
} from "@/lib/auth/user-role-display";
import { SearchableRtlSelect } from "@/components/ui/searchable-rtl-select";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import { SignatureImage } from "@/components/signatures/signature-image";
import {
  SAUDI_CITIES,
  SAUDI_CITY_OTHER_OPTION,
} from "@/lib/constants/saudi-cities";
import {
  EDUCATION_ADMINISTRATIONS,
  normalizeEducationAdministration,
  OTHER_SCHOOL_PROFILE_OPTION,
  SCHOOL_STAGES,
} from "@/lib/constants/school-profile-options";

type CurrentUserSignatureKind =
  | "principal"
  | "activityLeader"
  | "counselor"
  | "teacher";

type SchoolSettingsFormState = {
  officialName: string;
  currentUserName: string;
  currentUserRole: string;
  currentUserGender: string;
  currentUserSignatureKind: CurrentUserSignatureKind | "";
  currentUserSignatureUrl: string;
  currentUserSignedAt: string;
  jobTitle: string;
  phone: string;
  schoolName: string;
  schoolStatisticalNumber: string;
  principalName: string;
  principalPhone: string;
  principalSignatureUrl: string;
  principalSignatureRequestedAt: string;
  principalSignatureSignedAt: string;
  principalSignatureReusePolicy: "ALL_STAFF" | "SELECTED_STAFF" | "MANUAL_ONLY";
  principalSignatureReuseUserIds: string[];
  principalSignatureReuseStaff: Array<{ id: string; name: string; role: string }>;
  activityLeaderName: string;
  activityLeaderSignatureUrl: string;
  activityLeaderSignedAt: string;
  counselorSignatureUrl: string;
  counselorSignedAt: string;
  educationDepartment: string;
  educationOffice: string;
  city: string;
  district: string;
  stage: string;
  logoUrl: string;
  onboardingCompleted?: boolean;
};

function normalizeSchoolSettingsData(data: Partial<SchoolSettingsFormState> | null | undefined): SchoolSettingsFormState {
  return {
    officialName: data?.officialName || "",
    currentUserName: data?.currentUserName || data?.officialName || "صاحب الحساب",
    currentUserRole: data?.currentUserRole || "",
    currentUserGender: data?.currentUserGender || "UNKNOWN",
    currentUserSignatureKind: data?.currentUserSignatureKind || "",
    currentUserSignatureUrl: data?.currentUserSignatureUrl || "",
    currentUserSignedAt: data?.currentUserSignedAt || "",
    jobTitle: data?.jobTitle || "",
    phone: data?.phone || "",
    schoolName: data?.schoolName || "",
    schoolStatisticalNumber: data?.schoolStatisticalNumber || "",
    principalName: data?.principalName || "",
    principalPhone: data?.principalPhone || "",
    principalSignatureUrl: data?.principalSignatureUrl || "",
    principalSignatureRequestedAt: data?.principalSignatureRequestedAt || "",
    principalSignatureSignedAt: data?.principalSignatureSignedAt || "",
    principalSignatureReusePolicy: data?.principalSignatureReusePolicy || "MANUAL_ONLY",
    principalSignatureReuseUserIds: data?.principalSignatureReuseUserIds || [],
    principalSignatureReuseStaff: data?.principalSignatureReuseStaff || [],
    activityLeaderName: data?.activityLeaderName || "",
    activityLeaderSignatureUrl: data?.activityLeaderSignatureUrl || "",
    activityLeaderSignedAt: data?.activityLeaderSignedAt || "",
    counselorSignatureUrl: data?.counselorSignatureUrl || "",
    counselorSignedAt: data?.counselorSignedAt || "",
    educationDepartment: normalizeEducationAdministration(
      data?.educationDepartment,
    ),
    educationOffice: data?.educationOffice || "",
    city: data?.city || "",
    district: data?.district || "",
    stage: data?.stage || "",
    logoUrl: data?.logoUrl || "",
    onboardingCompleted: Boolean(data?.onboardingCompleted),
  };
}

const EMPTY_FORM: SchoolSettingsFormState = {
  officialName: "",
  currentUserName: "صاحب الحساب",
  currentUserRole: "",
  currentUserGender: "UNKNOWN",
  currentUserSignatureKind: "",
  currentUserSignatureUrl: "",
  currentUserSignedAt: "",
  jobTitle: "",
  phone: "",
  schoolName: "",
  schoolStatisticalNumber: "",
  principalName: "",
  principalPhone: "",
  principalSignatureUrl: "",
  principalSignatureRequestedAt: "",
  principalSignatureSignedAt: "",
  principalSignatureReusePolicy: "MANUAL_ONLY",
  principalSignatureReuseUserIds: [],
  principalSignatureReuseStaff: [],
  activityLeaderName: "",
  activityLeaderSignatureUrl: "",
  activityLeaderSignedAt: "",
  counselorSignatureUrl: "",
  counselorSignedAt: "",
  educationDepartment: "",
  educationOffice: "",
  city: "",
  district: "",
  stage: "",
  logoUrl: "",
  onboardingCompleted: false,
};

export function SchoolSettingsForm() {
  const [form, setForm] = useState<SchoolSettingsFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] =
    useState<SchoolSettingsFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [schoolSignaturePadOpen, setSchoolSignaturePadOpen] =
    useState<CurrentUserSignatureKind | null>(null);
  const [signatureSavingKind, setSignatureSavingKind] = useState<
    CurrentUserSignatureKind | ""
  >("");
  const [sendingPrincipalRequest, setSendingPrincipalRequest] = useState(false);
  const [principalSignatureLink, setPrincipalSignatureLink] = useState("");
  const [principalPhoneModalOpen, setPrincipalPhoneModalOpen] = useState(false);
  const [principalPhoneDraft, setPrincipalPhoneDraft] = useState("");
  const [principalSignatureRequestModal, setPrincipalSignatureRequestModal] =
    useState<null | {
      signatureUrl: string;
      whatsappUrl: string;
      messageText: string;
    }>(null);
  const [deletePrincipalSignatureConfirmationOpen, setDeletePrincipalSignatureConfirmationOpen] = useState(false);
  const [deletingPrincipalSignature, setDeletingPrincipalSignature] = useState(false);
  const [principalWhatsAppLink, setPrincipalWhatsAppLink] = useState("");
  const identityCopy = getArabicUserRoleIdentityCopy({
    role: form.currentUserRole,
    gender: form.currentUserGender,
  });

  const requiredCompleted = useMemo(() => {
    return Boolean(
      form.officialName.trim() &&
        form.jobTitle.trim() &&
        form.schoolName.trim() &&
        EDUCATION_ADMINISTRATIONS.includes(
          form.educationDepartment as (typeof EDUCATION_ADMINISTRATIONS)[number],
        ) &&
        form.city.trim() &&
        form.city !== SAUDI_CITY_OTHER_OPTION &&
        form.stage.trim() &&
        form.stage !== OTHER_SCHOOL_PROFILE_OPTION
    );
  }, [form]);

  const citySelection = SAUDI_CITIES.some((city) => city === form.city)
    ? form.city
    : form.city
      ? SAUDI_CITY_OTHER_OPTION
      : "";
  const stageSelection = SCHOOL_STAGES.includes(
    form.stage as (typeof SCHOOL_STAGES)[number]
  )
    ? form.stage
    : form.stage
      ? OTHER_SCHOOL_PROFILE_OPTION
      : "";

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const readiness = useMemo(() => {
    return calculateSchoolIdentityReadiness(form, {
      role: form.currentUserRole,
      gender: form.currentUserGender,
    });
  }, [form]);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);

        const response = await fetch("/api/dashboard/settings/school", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر تحميل إعدادات المدرسة.");
        }

        if (active) {
          const normalizedData = normalizeSchoolSettingsData(data.data);
          setForm(normalizedData);
          setInitialForm(normalizedData);
        }
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "حدث خطأ أثناء تحميل الإعدادات.",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function update(key: keyof SchoolSettingsFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function uploadLogo(file: File | null) {
    setFeedback(null);

    if (!file) return;

    try {
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/dashboard/settings/school/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر رفع الشعار.");
      }

      setForm((current) => ({
        ...current,
        logoUrl: data.logoUrl,
      }));

      setFeedback({
        type: "success",
        message: "تم رفع شعار المدرسة بنجاح. اضغط حفظ البيانات لتثبيت بقية التعديلات إن وجدت.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "حدث خطأ أثناء رفع الشعار.",
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save() {
    setFeedback(null);

    if (
      form.schoolStatisticalNumber &&
      !/^\d+$/.test(form.schoolStatisticalNumber)
    ) {
      setFeedback({
        type: "warning",
        message: "الرقم الإحصائي للمدرسة يجب أن يحتوي على أرقام فقط.",
      });
      return;
    }

    if (!requiredCompleted) {
      setFeedback({
        type: "warning",
        message:
          "أكمل الحقول المطلوبة واختر إدارة التعليم والمدينة والمرحلة.",
      });
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/dashboard/settings/school", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ الإعدادات.");
      }

      const nextForm = {
        ...form,
        currentUserName: form.officialName || form.currentUserName,
        onboardingCompleted: true,
      };

      setForm(nextForm);
      setInitialForm(nextForm);

      setFeedback({
        type: "success",
        message: "تم حفظ بيانات المدرسة والحساب بنجاح.",
      });
      const showStandardSaveFeedback = window.dispatchEvent(new CustomEvent("teachix:school-settings-saved", { cancelable: true }));
      if (showStandardSaveFeedback) setSaveConfirmationOpen(true);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "حدث خطأ أثناء حفظ البيانات.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function reloadSchoolSettingsFromApi() {
    try {
      const response = await fetch("/api/dashboard/settings/school", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تحديث بيانات المدرسة.");
      }

      const normalizedData = normalizeSchoolSettingsData(data.data);

      setForm(normalizedData);
      setInitialForm(normalizedData);

      setFeedback({
        type: "success",
        message: "تم تحديث حالة التواقيع.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "تعذر تحديث حالة التواقيع.",
      });
    }
  }

  async function saveCurrentUserSignature(dataUrl: string) {
    setFeedback(null);

    try {
      if (!form.currentUserSignatureKind) {
        throw new Error(`لا يتوفر حفظ توقيع ${identityCopy.roleLabel} من هذه الصفحة.`);
      }

      setSignatureSavingKind(form.currentUserSignatureKind);

      const response = await fetch("/api/dashboard/settings/school/signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: form.currentUserSignatureKind,
          dataUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `تعذر حفظ توقيع ${identityCopy.roleLabel}.`);
      }

      const patch = {
        currentUserSignatureUrl: data.signatureUrl || "",
        currentUserSignedAt: data.signedAt || "",
      };

      setForm((current) => ({
        ...current,
        ...patch,
      }));

      setInitialForm((current) => ({
        ...current,
        ...patch,
      }));

      setSchoolSignaturePadOpen(null);

      setFeedback({
        type: "success",
        message: `تم حفظ توقيع ${identityCopy.roleLabel} وسيظهر تلقائيًا في التقارير المرتبطة بهذا الدور.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : `تعذر حفظ توقيع ${identityCopy.roleLabel}.`,
      });
    } finally {
      setSignatureSavingKind("");
    }
  }

  async function deletePrincipalSignature() {
    if (deletingPrincipalSignature) return;

    setDeletingPrincipalSignature(true);
    try {
      const response = await fetch("/api/dashboard/settings/school/signature", {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "تعذر حذف توقيع مدير المدرسة.");
      }

      setForm((current) => ({
        ...current,
        currentUserSignatureUrl: "",
        currentUserSignedAt: "",
        principalSignatureUrl: "",
        principalSignatureSignedAt: "",
        principalSignatureRequestedAt: "",
      }));
      setInitialForm((current) => ({
        ...current,
        currentUserSignatureUrl: "",
        currentUserSignedAt: "",
        principalSignatureUrl: "",
        principalSignatureSignedAt: "",
        principalSignatureRequestedAt: "",
      }));
      setDeletePrincipalSignatureConfirmationOpen(false);
      setFeedback({
        type: "success",
        message: "تم حذف توقيع مدير المدرسة المحفوظ من هوية المدرسة. التواقيع السابقة داخل التقارير واللقطات لم تتغير.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "تعذر حذف توقيع مدير المدرسة.",
      });
    } finally {
      setDeletingPrincipalSignature(false);
    }
  }

  async function sendPrincipalSignatureRequest(phoneOverride?: string) {
    setFeedback(null);
    const principalPhone = String(phoneOverride ?? form.principalPhone).trim();

    if (!principalPhone) {
      setPrincipalPhoneDraft(form.principalPhone || "");
      setPrincipalPhoneModalOpen(true);
      return;
    }
if (!form.principalName.trim()) {
      setFeedback({
        type: "warning",
        message: `اكتب اسم ${identityCopy.schoolPrincipalLabel} أولًا.`,
      });
      return;
    }

    try {
      setSendingPrincipalRequest(true);

      const response = await fetch(
        "/api/dashboard/settings/school/principal-signature-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            principalName: form.principalName,
            principalPhone,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `تعذر إنشاء رابط توقيع ${identityCopy.schoolPrincipalLabel}.`);
      }

      const signatureUrl = String(data.signatureUrl || "");
      const whatsappUrl = String(data.whatsappUrl || "");
      const messageText = `السلام عليكم،
فضلًا اعتماد توقيع ${identityCopy.schoolPrincipalLabel} في منصة تيتش إكس عبر الرابط:
${signatureUrl}`;

      setPrincipalSignatureLink(signatureUrl);
      setPrincipalWhatsAppLink(whatsappUrl);
      setPrincipalSignatureRequestModal({
        signatureUrl,
        whatsappUrl,
        messageText,
      });
      window.dispatchEvent(new CustomEvent("teachix:principal-signature-requested"));
      const patch = {
        principalSignatureRequestedAt: data.requestedAt || "",
      };

      setForm((current) => ({
        ...current,
        ...patch,
      }));

      setInitialForm((current) => ({
        ...current,
        ...patch,
      }));

      setFeedback({
        type: "success",
        message: `تم إنشاء رابط توقيع ${identityCopy.schoolPrincipalLabel}. افتح رابط الواتساب لإرساله.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : `تعذر إرسال رابط توقيع ${identityCopy.schoolPrincipalLabel}.`,
      });
    } finally {
      setSendingPrincipalRequest(false);
    }
  }
  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">
        جاري تحميل إعدادات المدرسة...
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      data-guidance="teacher-school-settings"
      data-principal-signature-ready={Boolean(form.principalSignatureUrl)}
      data-school-identity-ready={readiness.readyForOfficialReports}
      data-principal-name-ready={Boolean(form.principalName.trim())}
      data-has-changes={hasChanges}
    >
      <SmartFeedbackModal
        open={saveConfirmationOpen}
        type="success"
        title="تم الحفظ بنجاح"
        description="تم حفظ بيانات المدرسة الرسمية وتحديثها بنجاح."
        primaryActionLabel="حسنًا"
        onPrimaryAction={() => setSaveConfirmationOpen(false)}
        onOpenChange={setSaveConfirmationOpen}
      />

      <SmartFeedbackModal
        open={Boolean(feedback)}
        type={feedback?.type || "info"}
        title={feedback?.type === "success" ? "تم بنجاح" : feedback?.type === "warning" ? "تنبيه" : "تعذر تنفيذ العملية"}
        description={feedback?.message}
        primaryActionLabel="إغلاق"
        onOpenChange={(open) => {
          if (!open) setFeedback(null);
        }}
      />

      <IdentityReadinessCard readiness={readiness} />

      <ReportIdentityPreviewCard form={form} />

      <SchoolSignaturesCard
        form={form}
        sendingPrincipalRequest={sendingPrincipalRequest}
        signatureSavingKind={signatureSavingKind}
        principalSignatureLink={principalSignatureLink}
        principalWhatsAppLink={principalWhatsAppLink}
        onSendPrincipalSignatureRequest={sendPrincipalSignatureRequest}
        onOpenCurrentUserSignature={() => {
          if (form.currentUserSignatureKind) {
            setSchoolSignaturePadOpen(form.currentUserSignatureKind);
          }
        }}
        deletingPrincipalSignature={deletingPrincipalSignature}
        onRequestDeletePrincipalSignature={() => setDeletePrincipalSignatureConfirmationOpen(true)}
        onChangePrincipalReusePolicy={(policy) => update("principalSignatureReusePolicy", policy)}
        onTogglePrincipalReuseStaff={(userId) => setForm((current) => ({
          ...current,
          principalSignatureReuseUserIds: current.principalSignatureReuseUserIds.includes(userId)
            ? current.principalSignatureReuseUserIds.filter((id) => id !== userId)
            : [...current.principalSignatureReuseUserIds, userId],
        }))}
        onRefresh={reloadSchoolSettingsFromApi}
      />

      <SmartFeedbackModal
        open={deletePrincipalSignatureConfirmationOpen}
        type="warning"
        title="حذف التوقيع الحالي؟"
        description="سيؤدي هذا إلى إزالة توقيع مدير المدرسة المحفوظ من هوية المدرسة وإيقاف استخدامه تلقائيًا في التقارير الجديدة. لن يتم حذف التواقيع الموجودة مسبقًا داخل التقارير أو اللقطات المحفوظة."
        primaryActionLabel={deletingPrincipalSignature ? "جارٍ الحذف..." : "تأكيد حذف التوقيع"}
        secondaryActionLabel="إلغاء"
        onPrimaryAction={() => {
          void deletePrincipalSignature();
        }}
        onSecondaryAction={() => setDeletePrincipalSignatureConfirmationOpen(false)}
        onOpenChange={setDeletePrincipalSignatureConfirmationOpen}
      />

      {principalPhoneModalOpen ? (
        <PrincipalPhoneModal
          principalLabel={identityCopy.schoolPrincipalLabel}
          defaultValue={principalPhoneDraft || form.principalPhone}
          loading={sendingPrincipalRequest}
          onClose={() => setPrincipalPhoneModalOpen(false)}
          onSubmit={(phone) => {
            const cleanedPhone = phone.trim();

            setPrincipalPhoneDraft(cleanedPhone);
            setPrincipalPhoneModalOpen(false);
            setForm((current) => ({
              ...current,
              principalPhone: cleanedPhone,
            }));

            void sendPrincipalSignatureRequest(cleanedPhone);
          }}
        />
      ) : null}
      {principalSignatureRequestModal ? (
        <PrincipalSignatureRequestModal
          principalLabel={identityCopy.schoolPrincipalLabel}
          signatureUrl={principalSignatureRequestModal.signatureUrl}
          whatsappUrl={principalSignatureRequestModal.whatsappUrl}
          messageText={principalSignatureRequestModal.messageText}
          onClose={() => setPrincipalSignatureRequestModal(null)}
        />
      ) : null}


      {schoolSignaturePadOpen ? (
        <SchoolSignaturePadModal
          title={getArabicSignatureTitle({
            role: form.currentUserRole,
            gender: form.currentUserGender,
          })}
          signerName={form.currentUserName || identityCopy.roleLabel}
          saving={Boolean(signatureSavingKind)}
          onClose={() => setSchoolSignaturePadOpen(null)}
          onSave={saveCurrentUserSignature}
        />
      ) : null}
<section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-blue-700">هوية الحساب</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {identityCopy.accountHeading}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {identityCopy.accountDescription}
            </p>
          </div>

          <StatusBadge completed={Boolean(form.onboardingCompleted)} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            label={identityCopy.officialNameLabel}
            value={form.officialName}
            onChange={(value) => update("officialName", value)}
            required
          />

          <Input
            label="المسمى الوظيفي"
            value={form.jobTitle}
            onChange={(value) => update("jobTitle", value)}
            required
          />

          <Input
            label={identityCopy.phoneLabel}
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-black text-blue-700">هوية المدرسة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            بيانات المدرسة الرسمية
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            تستخدم هذه البيانات في ترويسة التقارير وملفات PDF والوثائق.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            label="اسم المدرسة"
            value={form.schoolName}
            onChange={(value) => update("schoolName", value)}
            required
            guidanceTarget="teacher-school-identity"
          />

          <Input
            label="الرقم الإحصائي للمدرسة"
            value={form.schoolStatisticalNumber}
            onChange={(value) =>
              update("schoolStatisticalNumber", value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            maxLength={50}
          />

          <Input
            label={`اسم ${identityCopy.schoolPrincipalLabel}`}
            value={form.principalName}
            onChange={(value) => update("principalName", value)}
            guidanceTarget="teacher-principal-name"
          />

          <Select
            label="إدارة التعليم"
            value={form.educationDepartment}
            onChange={(value) => update("educationDepartment", value)}
            options={EDUCATION_ADMINISTRATIONS}
            required
            unsupportedValue={form.educationDepartment}
          />

          <SearchableRtlSelect
            label="المدينة"
            value={citySelection}
            onChange={(value) => update("city", value)}
            options={[...SAUDI_CITIES, SAUDI_CITY_OTHER_OPTION]}
            placeholder="اختر المدينة"
            searchPlaceholder="ابحث عن مدينة أو محافظة"
            required
          />

          {citySelection === SAUDI_CITY_OTHER_OPTION ? (
            <Input
              label="اكتب اسم المدينة"
              value={form.city === SAUDI_CITY_OTHER_OPTION ? "" : form.city}
              onChange={(value) => update("city", value)}
              required
            />
          ) : null}

          <Select
            label="المرحلة"
            value={stageSelection}
            onChange={(value) => update("stage", value)}
            options={[...SCHOOL_STAGES, OTHER_SCHOOL_PROFILE_OPTION]}
            required
          />

          {stageSelection === OTHER_SCHOOL_PROFILE_OPTION ? (
            <Input
              label="اكتب المرحلة"
              value={
                form.stage === OTHER_SCHOOL_PROFILE_OPTION ? "" : form.stage
              }
              onChange={(value) => update("stage", value)}
              required
            />
          ) : null}

        </div>
      </section>

      <div className="sticky bottom-4 z-20 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">
              {hasChanges ? "يوجد تغييرات غير محفوظة" : "كل التغييرات محفوظة"}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              بعد حفظ هذه البيانات تختفي رسالة إكمال بيانات المدرسة.
            </p>
          </div>

          <button
            type="button"
            onClick={save}
            data-guidance="teacher-school-save"
            disabled={saving || !hasChanges}
            className="rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSignatureDate(value: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function SignatureStatusBadge({
  signed,
}: {
  signed: boolean;
}) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-black",
        signed
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      ].join(" ")}
    >
      {signed ? "محفوظ" : "غير محفوظ"}
    </span>
  );
}

function SchoolSignaturesCard({
  form,
  sendingPrincipalRequest,
  signatureSavingKind,
  principalSignatureLink,
  principalWhatsAppLink,
  onSendPrincipalSignatureRequest,
  onOpenCurrentUserSignature,
  deletingPrincipalSignature,
  onRequestDeletePrincipalSignature,
  onChangePrincipalReusePolicy,
  onTogglePrincipalReuseStaff,
  onRefresh,
}: {
  form: SchoolSettingsFormState;
  sendingPrincipalRequest: boolean;
  signatureSavingKind: CurrentUserSignatureKind | "";
  principalSignatureLink: string;
  principalWhatsAppLink: string;
  onSendPrincipalSignatureRequest: () => void;
  onOpenCurrentUserSignature: () => void;
  deletingPrincipalSignature: boolean;
  onRequestDeletePrincipalSignature: () => void;
  onChangePrincipalReusePolicy: (policy: SchoolSettingsFormState["principalSignatureReusePolicy"]) => void;
  onTogglePrincipalReuseStaff: (userId: string) => void;
  onRefresh: () => void;
}) {
  const isSchoolManager =
    String(form.currentUserRole || "").trim().toUpperCase() === "PRINCIPAL";
  const roleLabel = getArabicUserRoleLabel({
    role: form.currentUserRole,
    gender: form.currentUserGender,
  });
  const signatureTitle = getArabicSignatureTitle({
    role: form.currentUserRole,
    gender: form.currentUserGender,
  });
  const identityCopy = getArabicUserRoleIdentityCopy({
    role: form.currentUserRole,
    gender: form.currentUserGender,
  });
  const canSaveCurrentUserSignature = Boolean(
    form.currentUserSignatureKind,
  );

  return (
    <section data-guidance="teacher-principal-signature" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-blue-700">تواقيع المدرسة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            اعتماد التواقيع المستخدمة في التقارير
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            {identityCopy.signatureDescription}
            {isSchoolManager
              ? " يستخدم هذا التوقيع في التقارير بصفتك مدير/مديرة المدرسة."
              : " أما توقيع مدير/مديرة المدرسة فيتم إرساله برابط واتساب خاص ثم ينعكس تلقائيًا في التقارير."}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          تحديث الحالة
        </button>
      </div>

      <div className={`mt-6 grid gap-4 ${isSchoolManager ? "max-w-xl" : "lg:grid-cols-2"}`}>
        {isSchoolManager ? (
          <article className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/60 p-5 sm:col-span-2">
            <h3 className="text-lg font-black text-slate-950">سياسة استخدام توقيع مدير المدرسة</h3>
            <p className="mt-1 text-xs font-bold leading-6 text-slate-600">ربط المنسوب بالمدرسة يوفّر هوية المدرسة واسم المدير فقط، ولا يمنحه صلاحية استخدام التوقيع تلقائيًا.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {([
                ["ALL_STAFF", "جميع المنسوبين"],
                ["SELECTED_STAFF", "منسوبون محددون"],
                ["MANUAL_ONLY", "توقيع يدوي فقط"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-black text-slate-700">
                  <input type="radio" name="principalSignatureReusePolicy" value={value} checked={form.principalSignatureReusePolicy === value} onChange={() => onChangePrincipalReusePolicy(value)} />
                  {label}
                </label>
              ))}
            </div>
            {form.principalSignatureReusePolicy === "SELECTED_STAFF" ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {form.principalSignatureReuseStaff.length ? form.principalSignatureReuseStaff.map((member) => (
                  <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700">
                    <input type="checkbox" checked={form.principalSignatureReuseUserIds.includes(member.id)} onChange={() => onTogglePrincipalReuseStaff(member.id)} />
                    <span>{member.name}</span>
                  </label>
                )) : <p className="text-xs font-bold text-slate-500">لا يوجد منسوبون مؤهلون حاليًا.</p>}
              </div>
            ) : null}
          </article>
        ) : null}

        <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                {signatureTitle}
              </h3>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {form.currentUserName || roleLabel}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {roleLabel}
              </p>
            </div>

            <SignatureStatusBadge signed={Boolean(form.currentUserSignatureUrl)} />
          </div>

          <div className="mt-4 flex h-28 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white">
            {form.currentUserSignatureUrl ? (
              <SignatureImage
                src={form.currentUserSignatureUrl}
                alt={signatureTitle}
                className="max-h-20"
              />
            ) : (
              <span className="text-xs font-black text-slate-400">
                لا يوجد توقيع محفوظ
              </span>
            )}
          </div>

          {form.currentUserSignedAt ? (
            <p className="mt-3 text-xs font-bold text-slate-500">
              آخر توقيع: {formatSignatureDate(form.currentUserSignedAt)}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onOpenCurrentUserSignature}
            disabled={
              Boolean(signatureSavingKind) ||
              !canSaveCurrentUserSignature
            }
            className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signatureSavingKind
              ? "جاري الحفظ..."
              : !canSaveCurrentUserSignature
                ? `لا يتوفر حفظ توقيع ${roleLabel} من هذه الصفحة`
                : form.currentUserSignatureUrl
                  ? "تحديث التوقيع"
                  : "إضافة توقيع"}
          </button>

          {isSchoolManager && form.currentUserSignatureUrl ? (
            <button
              type="button"
              onClick={onRequestDeletePrincipalSignature}
              disabled={Boolean(signatureSavingKind) || deletingPrincipalSignature}
              className="mt-2 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingPrincipalSignature ? "جارٍ حذف التوقيع..." : "حذف التوقيع الحالي"}
            </button>
          ) : null}
        </article>

        {!isSchoolManager ? <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                توقيع {identityCopy.schoolPrincipalLabel}
              </h3>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {form.principalName || identityCopy.schoolPrincipalLabel}
              </p>
            </div>

            <SignatureStatusBadge signed={Boolean(form.principalSignatureUrl)} />
          </div>

          <div className="mt-4 flex h-28 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white">
            {form.principalSignatureUrl ? (
              <SignatureImage
                src={form.principalSignatureUrl}
                alt={`توقيع ${identityCopy.schoolPrincipalLabel}`}
                className="max-h-20"
              />
            ) : (
              <span className="text-xs font-black text-slate-400">
                يتم التوقيع من رابط واتساب خاص
              </span>
            )}
          </div>

          {form.principalSignatureSignedAt ? (
            <p className="mt-3 text-xs font-bold text-slate-500">
              آخر توقيع: {formatSignatureDate(form.principalSignatureSignedAt)}
            </p>
          ) : form.principalSignatureRequestedAt ? (
            <p className="mt-3 text-xs font-bold text-amber-600">
              تم إرسال طلب توقيع: {formatSignatureDate(form.principalSignatureRequestedAt)}
            </p>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onSendPrincipalSignatureRequest}
              data-guidance="teacher-principal-signature-request"
              disabled={sendingPrincipalRequest}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingPrincipalRequest ? "جاري إنشاء الرابط..." : `إنشاء رابط ${identityCopy.schoolPrincipalLabel}`}
            </button>

            {principalWhatsAppLink ? (
              <a
                href={principalWhatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-emerald-700"
              >
                فتح واتساب
              </a>
            ) : (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                تحديث بعد اكتمال التوقيع
              </button>
            )}

            {principalSignatureLink ? (
              <a
                href={principalSignatureLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-black text-blue-700 transition hover:bg-blue-50 sm:col-span-2"
              >
                فتح صفحة توقيع {identityCopy.schoolPrincipalLabel} مباشرة
              </a>
            ) : null}
          </div>
        </article> : null}
      </div>
    </section>
  );
}

function PrincipalPhoneModal({
  principalLabel,
  defaultValue,
  loading,
  onClose,
  onSubmit,
}: {
  principalLabel: string;
  defaultValue: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (phone: string) => void;
}) {
  const [phone, setPhone] = useState(defaultValue || "");

  const normalizedPhone = phone.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center"
      dir="rtl"
    >
      <section className="w-full max-w-xl rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-blue-700">
              توقيع {principalLabel}
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              رقم واتساب {principalLabel}
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              أدخل رقم واتساب {principalLabel} حتى يتم إنشاء رابط التوقيع وإرسال الرسالة الجاهزة.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <label className="text-xs font-black text-slate-500">
            رقم واتساب {principalLabel}
          </label>

          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="مثال: 9665xxxxxxxx"
            inputMode="tel"
            dir="ltr"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-black text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <p className="mt-3 text-xs font-bold leading-6 text-slate-500">
            اكتب الرقم بصيغة دولية إن أمكن، وسيتم توليد رابط التوقيع في الخطوة التالية.
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={() => onSubmit(normalizedPhone)}
            disabled={!normalizedPhone || loading}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جاري إنشاء الرابط..." : "إنشاء رابط التوقيع"}
          </button>
        </div>
      </section>
    </div>
  );
}
function PrincipalSignatureRequestModal({
  principalLabel,
  signatureUrl,
  whatsappUrl,
  messageText,
  onClose,
}: {
  principalLabel: string;
  signatureUrl: string;
  whatsappUrl: string;
  messageText: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center"
      dir="rtl"
    >
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-blue-700">رابط توقيع {principalLabel}</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              تم إنشاء رابط التوقيع
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              انسخ الرسالة أو افتح واتساب لإرسالها إلى {principalLabel}. بعد اكتمال التوقيع اضغط تحديث الحالة.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <label className="text-xs font-black text-slate-500">
            نص الرسالة
          </label>

          <textarea
            readOnly
            value={messageText}
            className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold leading-7 text-slate-800 outline-none"
          />

          <label className="mt-4 block text-xs font-black text-slate-500">
            رابط التوقيع المباشر
          </label>

          <input
            readOnly
            value={signatureUrl}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-bold text-slate-700 outline-none"
            dir="ltr"
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={copyMessage}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            {copied ? "تم النسخ" : "نسخ الرسالة"}
          </button>

          <a
            href={whatsappUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className={[
              "rounded-2xl px-4 py-3 text-center text-sm font-black text-white transition",
              whatsappUrl
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "pointer-events-none bg-slate-300",
            ].join(" ")}
          >
            فتح واتساب
          </a>

          <a
            href={signatureUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700"
          >
            فتح صفحة التوقيع
          </a>
        </div>
      </section>
    </div>
  );
}
function SchoolSignaturePadModal({
  title,
  signerName,
  saving,
  onClose,
  onSave,
}: {
  title: string;
  signerName: string;
  saving: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);
  const [draftSignature, setDraftSignature] = useState("");

  function resizeCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(320, Math.floor(rect.width * ratio));
    canvas.height = Math.floor(190 * ratio);

    const context = canvas.getContext("2d");

    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, 190);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const point = getPoint(event);

    context.lineTo(point.x, point.y);
    context.stroke();

    hasSignatureRef.current = true;
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas || !drawingRef.current) return;

    drawingRef.current = false;

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (hasSignatureRef.current) {
      setDraftSignature(canvas.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();

    context.clearRect(0, 0, rect.width, 190);

    hasSignatureRef.current = false;
    setDraftSignature("");
  }

  useEffect(() => {
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center" dir="rtl">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm font-bold text-slate-500">
              وقّع داخل المستطيل الأبيض ثم اضغط حفظ التوقيع.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            className="block h-[220px] w-full touch-none bg-white"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
          />
        </div>

        <p className="mt-3 text-xs font-black text-slate-500">
          الاسم المعتمد للتوقيع: {signerName}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={clearSignature}
            disabled={saving}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            مسح التوقيع
          </button>

          <button
            type="button"
            onClick={() => onSave(draftSignature)}
            disabled={!draftSignature || saving}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "حفظ التوقيع"}
          </button>
        </div>
      </section>
    </div>
  );
}
function SchoolLogoUploadCard({
  logoUrl,
  uploading,
  onUpload,
  onClear,
}: {
  logoUrl: string;
  uploading: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="شعار المدرسة"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="px-4 text-xs font-black leading-6 text-slate-400">
                شعار المدرسة
              </span>
            )}
          </div>

          {logoUrl ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-3 text-xs font-black text-red-600 hover:text-red-700"
            >
              إزالة الشعار
            </button>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-black text-blue-700">شعار المدرسة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            رفع شعار يظهر في التقارير الرسمية
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            يفضّل رفع شعار بصيغة PNG بخلفية شفافة أو SVG بجودة عالية. سيظهر الشعار في معاينة الهوية وملفات PDF الرسمية.
          </p>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center transition hover:bg-slate-50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  onUpload(file);
                  event.currentTarget.value = "";
                }}
                disabled={uploading}
              />

              <span className="block text-sm font-black text-slate-900">
                {uploading ? "جاري رفع الشعار..." : "اختر شعار المدرسة"}
              </span>

              <span className="mt-1 block text-xs font-bold text-slate-500">
                PNG / JPG / WEBP / SVG — الحد الأقصى 2MB
              </span>
            </label>

            <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-6 text-blue-700">
              نصيحة: استخدم صورة مربعة أو شعار شفاف حتى يظهر بشكل أجمل في الغلاف والترويسة.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IdentityReadinessCard({
  readiness,
}: {
  readiness: ReturnType<typeof calculateSchoolIdentityReadiness>;
}) {
  const tone =
    readiness.level === "excellent"
      ? "emerald"
      : readiness.level === "good"
        ? "blue"
        : readiness.level === "needs-work"
          ? "amber"
          : "red";

  const title =
    readiness.level === "excellent"
      ? "هوية رسمية ممتازة"
      : readiness.level === "good"
        ? "هوية جيدة وقريبة من الاكتمال"
        : readiness.level === "needs-work"
          ? "الهوية تحتاج بعض التحسين"
          : "الهوية غير مكتملة";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        <div
          className={[
            "flex flex-col items-center justify-center p-7 text-center",
            tone === "emerald"
              ? "bg-emerald-50"
              : tone === "blue"
                ? "bg-blue-50"
                : tone === "amber"
                  ? "bg-amber-50"
                  : "bg-red-50",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-32 w-32 items-center justify-center rounded-full border-[10px] bg-white text-3xl font-black",
              tone === "emerald"
                ? "border-emerald-200 text-emerald-700"
                : tone === "blue"
                  ? "border-blue-200 text-blue-700"
                  : tone === "amber"
                    ? "border-amber-200 text-amber-700"
                    : "border-red-200 text-red-700",
            ].join(" ")}
          >
            {readiness.score}%
          </div>

          <p className="mt-4 text-sm font-black text-slate-950">
            جاهزية الهوية الرسمية
          </p>

          <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
            {readiness.readyForOfficialReports
              ? "جاهزة لاستخدام التقارير الرسمية."
              : "أكمل الحقول الأساسية قبل إصدار التقارير الرسمية."}
          </p>
        </div>

        <div className="p-6">
          <p className="text-sm font-black text-blue-700">فحص ذكي</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ReadinessList
              title="حقول أساسية مطلوبة"
              emptyText="كل الحقول الأساسية مكتملة."
              items={readiness.missingRequired.map((item) => item.label)}
              type="required"
            />

            <ReadinessList
              title="تحسينات اختيارية"
              emptyText="الهوية شبه مكتملة."
              items={readiness.missingOptional.slice(0, 5).map((item) => item.label)}
              type="optional"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-600">
            كلما اكتملت الهوية، ظهرت التقارير الرسمية بشكل أقرب للوثائق المدرسية الجاهزة للطباعة والاعتماد.
          </div>
        </div>
      </div>
    </section>
  );
}

function ReadinessList({
  title,
  emptyText,
  items,
  type,
}: {
  title: string;
  emptyText: string;
  items: string[];
  type: "required" | "optional";
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-900">{title}</p>

      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className={[
                "rounded-2xl px-3 py-2 text-xs font-bold",
                type === "required"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700",
              ].join(" ")}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function ReportIdentityPreviewCard({
  form,
}: {
  form: SchoolSettingsFormState;
}) {
  const identityCopy = getArabicUserRoleIdentityCopy({
    role: form.currentUserRole,
    gender: form.currentUserGender,
  });

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-blue-700">معاينة فورية</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            شكل الهوية في التقارير
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            هذه معاينة تقريبية للترويسة والبيانات التي ستظهر في PDF.
          </p>
        </div>
</div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-3 text-center text-sm font-black text-slate-800 md:grid-cols-3">
          <p>وزارة التعليم</p>
          <p>{form.educationDepartment || "إدارة التعليم"}</p>
</div>

        <div className="mt-5 rounded-2xl bg-white p-5 text-center">
          <p className="text-2xl font-black text-slate-950">
            {form.schoolName || "اسم المدرسة"}
          </p>

        </div>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <PreviewLine label={identityCopy.roleLabel} value={form.officialName || "الاسم الرسمي"} />
          <PreviewLine label="المسمى" value={form.jobTitle || "المسمى الوظيفي"} />
          <PreviewLine label={identityCopy.schoolPrincipalLabel} value={form.principalName || "غير محدد"} />
          <PreviewLine label="المدينة" value={form.city || "غير محدد"} />
        </div>
      </div>
    </section>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function StatusBadge({ completed }: { completed: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-4 py-2 text-xs font-black",
        completed
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {completed ? "مكتملة" : "غير مكتملة"}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
  inputMode,
  maxLength,
  guidanceTarget,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  guidanceTarget?: string;
}) {
  return (
    <label className="block" data-guidance={guidanceTarget}>
      <span className="text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        maxLength={maxLength}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required = false,
  unsupportedValue,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  required?: boolean;
  unsupportedValue?: string;
}) {
  const hasUnsupportedValue = Boolean(
    unsupportedValue && !options.includes(unsupportedValue)
  );

  return (
    <label className="block min-w-0">
      <span className="text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">اختر {label}</option>
        {hasUnsupportedValue ? (
          <option value={unsupportedValue}>
            {unsupportedValue} (قيمة محفوظة)
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
