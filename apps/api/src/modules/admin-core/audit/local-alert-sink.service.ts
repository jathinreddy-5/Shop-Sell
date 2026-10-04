import { Injectable, Logger } from '@nestjs/common';
import { AdminAlertSink, SecurityAlert } from './admin-alert.interface';

@Injectable()
export class LocalAlertSinkService implements AdminAlertSink {
  private readonly logger = new Logger('SecurityAlertHub');
  private readonly alerts: SecurityAlert[] = [];

  async dispatchAlert(alert: SecurityAlert): Promise<void> {
    this.alerts.push(alert);
    const prefix = alert.severity === 'CRITICAL' ? '🚨 [CRITICAL ALERT]' : '⚠️ [SECURITY WARNING]';
    this.logger.warn(`${prefix} ${alert.title}: ${alert.description}`);

    // If webhook configured (e.g. Slack / PagerDuty / OpsGenie), dispatch HTTP post
    const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `${prefix} *${alert.title}*\n${alert.description}\nTime: ${alert.timestamp}`,
          }),
        });
      } catch (err: any) {
        this.logger.error(`Failed to dispatch alert webhook: ${err.message}`);
      }
    }
  }

  getAlertHistory(): SecurityAlert[] {
    return [...this.alerts];
  }
}
