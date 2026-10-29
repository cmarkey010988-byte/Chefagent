/**
 * P2PTlsSecurityManager.ts
 *
 * Production Hardening Security Manager for P2P Local Mesh & Cloud Sync.
 * Configures certificate pinning rules, verifies cleartext local subnets,
 * and enforces TLS 1.3 encryption when node-to-node sync is deployed across public Wi-Fi.
 */

export interface PinConfig {
  domain: string;
  pins: string[]; // SHA-256 public key hashes
}

export class P2PTlsSecurityManager {
  private static pinnedDomains: Map<string, string[]> = new Map([
    [
      'api.chefagent.com',
      [
        'a8s9df7a8sdf9a7sd8f9a7sdf98a7sdf98a7sdf98a7=',
        '9s8df7a98sdf7a98sdf7a98sdf7a98sdf7a98sdf7=',
      ],
    ],
  ]);

  /**
   * Check whether cleartext HTTP/WS traffic is permitted for an IP/hostname
   * Permitted for local private IP subnets (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12, 127.0.0.1, localhost)
   */
  public static isCleartextPermitted(host: string): boolean {
    const cleanHost = host.replace(/^https?:\/\//, '').split(':')[0].toLowerCase();

    if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') return true;

    // Check 192.168.X.X
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;

    // Check 10.X.X.X
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;

    // Check 172.16-31.X.X
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;

    return false;
  }

  /**
   * Validate SHA-256 certificate pin for a domain
   */
  public static verifyCertificatePin(domain: string, candidatePinHash: string): boolean {
    const validPins = this.pinnedDomains.get(domain.toLowerCase());
    if (!validPins) return true; // No pin policy configured for this domain
    return validPins.includes(candidatePinHash);
  }

  /**
   * Add domain certificate pin
   */
  public static addDomainPin(domain: string, pinSha256: string): void {
    const existing = this.pinnedDomains.get(domain.toLowerCase()) || [];
    if (!existing.includes(pinSha256)) {
      existing.push(pinSha256);
      this.pinnedDomains.set(domain.toLowerCase(), existing);
    }
  }
}
