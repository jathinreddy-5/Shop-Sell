export class AdminLoginDto {
  email!: string;
  password!: string;
}

export class PasskeyVerifyDto {
  adminId!: string;
  challengeId!: string;
  proof?: any;
}

export class StepUpChallengeDto {
  action!: string;
}

export class StepUpVerifyDto {
  challengeId!: string;
  proof?: any;
}

export class CreateApprovalRequestDto {
  action_key!: string;
  payload!: any;
  reason?: string;
  ticket_ref?: string;
}

export class DecideApprovalDto {
  decision!: 'approved' | 'rejected';
  reason?: string;
  step_up_token?: string;
}

export class BreakGlassDto {
  reason!: string;
  ticketRef!: string;
  roleId?: string;
  permissionId?: string;
  durationMinutes?: number;
}

export class JitElevationDto {
  reason!: string;
  ticketRef!: string;
  roleId?: string;
  permissionId?: string;
  durationMinutes?: number;
}

export class ToggleKillSwitchDto {
  enabled!: boolean;
  reason!: string;
}

export class RevealPiiDto {
  resourceType!: string;
  resourceId!: string;
  fieldName!: string;
  reason!: string;
  stepUpToken!: string;
  encryptedData?: any;
}

export class ImpersonateCustomerDto {
  customerId!: string;
  reason!: string;
  ticketRef!: string;
}

export class InviteAdminDto {
  email!: string;
  fullName!: string;
  roles!: string[];
  reason?: string;
}
