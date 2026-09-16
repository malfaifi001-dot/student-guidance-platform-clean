import "server-only";

const text = (value: string | undefined) => value?.trim() || "";

export function getMetaWhatsAppConfig() {
  return {
    accessToken: text(process.env.WHATSAPP_META_ACCESS_TOKEN),
    phoneNumberId: text(process.env.WHATSAPP_META_PHONE_NUMBER_ID),
    businessAccountId: text(process.env.WHATSAPP_META_BUSINESS_ACCOUNT_ID),
    verifyToken: text(process.env.WHATSAPP_META_VERIFY_TOKEN),
    appSecret: text(process.env.WHATSAPP_META_APP_SECRET),
    apiVersion: text(process.env.WHATSAPP_META_API_VERSION) || "v23.0",
  };
}

export function getMetaWhatsAppHealth() {
  const config = getMetaWhatsAppConfig();
  return {
    accessTokenConfigured: Boolean(config.accessToken),
    phoneNumberIdConfigured: Boolean(config.phoneNumberId),
    businessAccountIdConfigured: Boolean(config.businessAccountId),
    verifyTokenConfigured: Boolean(config.verifyToken),
    appSecretConfigured: Boolean(config.appSecret),
    signatureVerificationEnabled: Boolean(config.appSecret),
    sendingReady: Boolean(config.accessToken && config.phoneNumberId),
    templateSyncReady: Boolean(config.accessToken && config.businessAccountId),
  };
}
