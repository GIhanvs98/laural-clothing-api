import { redisClient } from '../config/redis';

export interface FraudEvaluationResult {
  fraudScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
  fraudSignals: string[];
}

export const fraudService = {
  /**
   * Evaluates an incoming checkout attempt for fraud risk.
   */
  async evaluateCheckoutRisk(
    cart: any,
    customerData: { phone: string; email?: string; isGuest?: boolean },
    shippingAddress: any,
    totals: { total: number },
    deviceFingerprint?: string
  ): Promise<FraudEvaluationResult> {
    let fraudScore = 0;
    const fraudSignals: string[] = [];

    // 1. Guest Checkout
    if (customerData.isGuest !== false) {
      fraudScore += 10;
      fraudSignals.push('Guest Checkout');
    }

    // 2. High Order Value (e.g., > 100,000 LKR)
    if (totals.total > 100000) {
      fraudScore += 20;
      fraudSignals.push(`High Order Value (${totals.total})`);
    }

    // 3. Bulk Item Quantity
    let hasBulkItems = false;
    for (const item of cart.items) {
      if (item.quantity > 5) {
        hasBulkItems = true;
        break;
      }
    }
    if (hasBulkItems) {
      fraudScore += 15;
      fraudSignals.push('Unusually high quantity of a single SKU');
    }

    // 4. Device Fingerprint Velocity (if available)
    if (deviceFingerprint) {
      const fingerprintKey = `fingerprint:checkout:${deviceFingerprint}`;
      // In checkout.controller.ts, this was already incremented. We just read it.
      const attemptsStr = await redisClient.get(fingerprintKey);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      
      if (attempts > 3) {
        fraudScore += 30;
        fraudSignals.push(`High velocity from device (${attempts} attempts)`);
      }
    }

    // Determine Risk Level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED' = 'LOW';
    if (fraudScore >= 90) riskLevel = 'BLOCKED';
    else if (fraudScore >= 71) riskLevel = 'HIGH';
    else if (fraudScore >= 31) riskLevel = 'MEDIUM';

    return {
      fraudScore,
      riskLevel,
      fraudSignals,
    };
  }
};
