export const alertService = {
  sendFraudAlert: async (orderId: string, fraudScore: number, riskLevel: string, signals: string[], cartId: string) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn(`[Alert Service] SLACK_WEBHOOK_URL not configured. Skipping alert for Order ${orderId}`);
      return;
    }

    try {
      const payload = {
        text: `🚨 *High Risk Order Detected* 🚨\n*Order ID / Cart:* ${orderId || cartId}\n*Risk Level:* ${riskLevel}\n*Fraud Score:* ${fraudScore}/100\n*Signals:*\n${signals.map(s => `- ${s}`).join('\n')}`
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`[Alert Service] Dispatched fraud alert for cart/order ${cartId}`);
    } catch (error) {
      console.error(`[Alert Service] Failed to send webhook alert:`, error);
    }
  },
  sendSecurityAlert: async (title: string, message: string, ip: string, additionalDetails: any = {}) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn(`[Alert Service] SLACK_WEBHOOK_URL not configured. Skipping security alert.`);
      return;
    }

    try {
      const payload = {
        text: `🔒 *Security Alert: ${title}* 🔒\n*IP Address:* ${ip}\n*Message:* ${message}\n*Details:*\n\`\`\`${JSON.stringify(additionalDetails, null, 2)}\`\`\``
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`[Alert Service] Dispatched security alert for IP ${ip}`);
    } catch (error) {
      console.error(`[Alert Service] Failed to send security webhook alert:`, error);
    }
  }
};
