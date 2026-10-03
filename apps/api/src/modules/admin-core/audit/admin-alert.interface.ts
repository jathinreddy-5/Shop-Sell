export const ADMIN_ALERT_SINK_TOKEN = 'ADMIN_ALERT_SINK_TOKEN';

export interface SecurityAlert {
  alertType:
    | 'REFUND_SPIKE'
    | 'MASS_PII_EXPORT'
    | 'OFF_HOURS_LOGIN'
    | 'REPEATED_ACCESS_DENIED'
    | 'BREAK_GLASS_INVOKED'
    | 'ROLE_PERMISSIONS_CHANGED'
    | 'KILL_SWITCH_TRIGGERED'
    | 'AUDIT_CHAIN_INTEGRITY_FAILURE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  actorAdminId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface AdminAlertSink {
  dispatchAlert(alert: SecurityAlert): Promise<void>;
}
