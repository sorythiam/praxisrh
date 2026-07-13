import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@praxis/shared';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

export interface SendNotificationParams {
  personId: string;
  template: string; // e.g. "PLANNING_PUBLISHED", "PAYSLIP_AVAILABLE", "LEAVE_DECISION"
  payload: Record<string, unknown>;
  preferredChannel?: NotificationChannel;
}

/**
 * Multi-channel notification engine with automatic fallback (WhatsApp ->
 * SMS if WhatsApp is unavailable), per section 5.2 of the spec. The
 * WhatsApp/SMS adapters below are intentionally thin stubs — swap the
 * body of `sendWhatsapp`/`sendSms` for a real Meta Cloud API / Twilio
 * call when credentials are available; every call site in the app
 * already goes through this single service.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async send(params: SendNotificationParams): Promise<any> {
    const channel = params.preferredChannel ?? NotificationChannel.WHATSAPP;
    const record = await (this.tenantPrisma.client as any).notification.create({
      data: {
        personId: params.personId,
        channel,
        template: params.template,
        payload: params.payload,
        status: 'QUEUED',
      },
    });

    try {
      await this.dispatch(channel, params);
      await (this.tenantPrisma.client as any).notification.update({
        where: { id: record.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      if (channel === NotificationChannel.WHATSAPP) {
        this.logger.warn(`WhatsApp indisponible pour ${params.personId}, repli SMS.`);
        return this.send({ ...params, preferredChannel: NotificationChannel.SMS });
      }
      await (this.tenantPrisma.client as any).notification.update({
        where: { id: record.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
    return record;
  }

  private async dispatch(channel: NotificationChannel, params: SendNotificationParams) {
    switch (channel) {
      case NotificationChannel.WHATSAPP:
        return this.sendWhatsapp(params);
      case NotificationChannel.SMS:
        return this.sendSms(params);
      case NotificationChannel.EMAIL:
        return this.sendEmail(params);
    }
  }

  private async sendWhatsapp(params: SendNotificationParams) {
    this.logger.log(`[WHATSAPP stub] ${params.template} -> person ${params.personId}: ${JSON.stringify(params.payload)}`);
  }

  private async sendSms(params: SendNotificationParams) {
    this.logger.log(`[SMS stub] ${params.template} -> person ${params.personId}: ${JSON.stringify(params.payload)}`);
  }

  private async sendEmail(params: SendNotificationParams) {
    this.logger.log(`[EMAIL stub] ${params.template} -> person ${params.personId}: ${JSON.stringify(params.payload)}`);
  }
}
