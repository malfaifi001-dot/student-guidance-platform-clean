import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeSaudiWhatsAppNumber } from "@/lib/whatsapp/whatsapp-links";
import { sendCloudMessage } from "@/lib/whatsapp/whatsapp-service";

export async function createCampaignRecipients(campaignId: string, userIds: string[], role?: string) {
  const users = await prisma.user.findMany({ where: { ...(userIds.length ? { id: { in: userIds } } : {}), ...(role ? { role: role as never } : {}), phone: { not: null } }, select: { id: true, phone: true } });
  const phones = [...new Map(users.map(u => [normalizeSaudiWhatsAppNumber(u.phone), u])).entries()].filter((item): item is [string, typeof users[number]] => Boolean(item[0]));
  const consents = await prisma.whatsAppContactConsent.findMany({ where: { normalizedPhone: { in: phones.map(([phone]) => phone) }, marketingOptIn: true, consentRevokedAt: null }, select: { normalizedPhone: true } }); const eligible = new Set(consents.map(c=>c.normalizedPhone));
  await prisma.whatsAppCampaignRecipient.createMany({ data: phones.filter(([phone])=>eligible.has(phone)).map(([normalizedPhone,u])=>({campaignId,normalizedPhone,linkedUserId:u.id})), skipDuplicates:true });
  const count = await prisma.whatsAppCampaignRecipient.count({ where:{campaignId} }); await prisma.whatsAppCampaign.update({where:{id:campaignId},data:{estimatedCount:count,status:count?"READY":"DRAFT"}}); return count;
}

export async function dispatchCampaignBatch(campaignId: string, batchSize = 20) {
  const campaign = await prisma.whatsAppCampaign.findUnique({where:{id:campaignId},include:{template:true}}); if(!campaign || ["CANCELED","COMPLETED","FAILED"].includes(campaign.status)) return { processed:0, done:true };
  await prisma.whatsAppCampaign.update({where:{id:campaignId},data:{status:"PROCESSING",startedAt:campaign.startedAt||new Date()}});
  const recipients=await prisma.whatsAppCampaignRecipient.findMany({where:{campaignId,status:"PENDING"},take:Math.min(Math.max(batchSize,1),50),orderBy:{createdAt:"asc"}}); let processed=0;
  for(const r of recipients){const locked=await prisma.whatsAppCampaignRecipient.updateMany({where:{id:r.id,status:"PENDING"},data:{status:"PROCESSING",attemptedAt:new Date()}});if(!locked.count)continue;const output=await sendCloudMessage({phone:r.normalizedPhone,kind:"template",templateName:campaign.template.name,language:campaign.templateLanguage,parameters:Array.isArray(campaign.templateParameters)?campaign.templateParameters.map(String):[],campaignId,idempotencyKey:crypto.createHash("sha256").update(`campaign:${campaignId}:${r.normalizedPhone}`).digest("hex")});await prisma.whatsAppCampaignRecipient.update({where:{id:r.id},data:output.ok?{status:"SENT",sentAt:new Date(),outboundMessageId:output.message.id}:{status:"FAILED",failedAt:new Date(),failureCode:"SEND_FAILED",safeFailureMessage:output.error}});processed++;}
  const [pending,sent,failed]=await Promise.all([prisma.whatsAppCampaignRecipient.count({where:{campaignId,status:{in:["PENDING","PROCESSING"]}}}),prisma.whatsAppCampaignRecipient.count({where:{campaignId,status:"SENT"}}),prisma.whatsAppCampaignRecipient.count({where:{campaignId,status:"FAILED"}})]);await prisma.whatsAppCampaign.update({where:{id:campaignId},data:{sentCount:sent+failed,successCount:sent,failureCount:failed,status:pending?"PROCESSING":(failed&& !sent?"FAILED":"COMPLETED"),completedAt:pending?null:new Date()}});return {processed,done:!pending};
}
