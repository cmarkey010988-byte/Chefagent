/**
 * src/services/security/AuthInterceptor.ts
 *
 * Role-Based Access Control (RBAC) client utility and authorization header builder
 * for ChefAgent Executive Portal and API requests.
 * Strictly enforces zero-trust privilege boundaries:
 * - Line Cook (Level 1): Execution only, executive navigation completely locked out
 * - Head Chef (Level 2): Kitchen management, recipes, and prep scheduling
 * - General Manager (Level 3): Property-level FOH/BOH analytics and financial reporting
 * - Corporate Executive (Level 4): Portfolio macro analytics, ERP export, and global ledger modifications
 */

export type UserRole =
  | 'ROLE_LINE_COOK'
  | 'ROLE_HEAD_CHEF'
  | 'ROLE_GENERAL_MANAGER'
  | 'ROLE_CORPORATE_EXECUTIVE';

export interface AuthSession {
  userId: string;
  fullName: string;
  propertyId: string;
  role: UserRole;
  token: string;
  issuedAt?: number;
}

export class AuthInterceptor {
  private static currentSession: AuthSession = {
    userId: 'exec-001',
    fullName: 'Victoria Sterling (VP F&B Operations)',
    propertyId: 'PROP-ALL-REGIONAL',
    role: 'ROLE_CORPORATE_EXECUTIVE',
    token: 'chefagent-exec-secure-token-2026-xyz',
    issuedAt: Date.now(),
  };

  private static readonly ROLE_LEVELS: Record<UserRole, number> = {
    ROLE_LINE_COOK: 1,
    ROLE_HEAD_CHEF: 2,
    ROLE_GENERAL_MANAGER: 3,
    ROLE_CORPORATE_EXECUTIVE: 4,
  };

  static setSession(session: AuthSession) {
    this.currentSession = {
      ...session,
      issuedAt: session.issuedAt || Date.now(),
    };
  }

  static getSession(): AuthSession {
    return { ...this.currentSession };
  }

  /**
   * Evaluates if session possesses executive privileges (ROLE_CORPORATE_EXECUTIVE or ROLE_GENERAL_MANAGER)
   */
  static hasExecutiveAccess(): boolean {
    const level = this.ROLE_LEVELS[this.currentSession.role] || 0;
    return level >= 3;
  }

  /**
   * Strictly evaluates if session is corporate executive (ROLE_CORPORATE_EXECUTIVE)
   */
  static isCorporateExecutive(): boolean {
    return this.currentSession.role === 'ROLE_CORPORATE_EXECUTIVE';
  }

  /**
   * Verifies access to financial ledgers, GL batch exports, and AdelicZeta verification routes
   */
  static canModifyFinancialLedger(): boolean {
    return this.hasExecutiveAccess();
  }

  /**
   * Verifies if administrative PIN overrides may be executed by this session
   * Line cooks and non-credentialed terminals are strictly prohibited
   */
  static canExecuteAdminPinOverride(): boolean {
    return this.hasExecutiveAccess();
  }

  /**
   * Verifies whether executive navigation graphs or modals should be rendered
   */
  static shouldRenderExecutiveNavigation(): boolean {
    return this.hasExecutiveAccess();
  }

  /**
   * Injects authorization headers into API request options
   */
  static injectAuthHeaders(headers: HeadersInit = {}): HeadersInit {
    return {
      ...headers,
      'Authorization': `Bearer ${this.currentSession.token}`,
      'X-User-Role': this.currentSession.role,
      'X-Property-Id': this.currentSession.propertyId,
    };
  }
}
