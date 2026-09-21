import * as crypto from 'crypto';

export class KokoProvider {
  private merchantId = process.env.KOKO_MERCHANT_ID || '';
  private apiKey = process.env.KOKO_API_KEY || '';
  private apiUrl = process.env.KOKO_API_URL || 'https://qaapi.paykoko.com';
  
  private formatKey(key: string, type: 'PRIVATE' | 'PUBLIC'): string {
    key = key.replace(/\\n/g, '\n').trim();
    if (key && !key.includes('-----BEGIN')) {
      const formattedKey = key.match(/.{1,64}/g)?.join('\n') || key;
      return `-----BEGIN ${type === 'PRIVATE' ? 'RSA PRIVATE' : 'PUBLIC'} KEY-----\n${formattedKey}\n-----END ${type === 'PRIVATE' ? 'RSA PRIVATE' : 'PUBLIC'} KEY-----`;
    }
    return key;
  }

  private get privateKey(): string {
    return this.formatKey(process.env.KOKO_PRIVATE_KEY || '', 'PRIVATE');
  }

  private get publicKey(): string {
    return this.formatKey(process.env.KOKO_PUBLIC_KEY || '', 'PUBLIC');
  }

  private sign(dataString: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(dataString);
    return sign.sign(this.privateKey, 'base64');
  }

  private verify(dataString: string, signature: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(dataString);
    return verify.verify(this.publicKey, signature, 'base64');
  }

  async createPaymentParams(orderId: string, amount: number, currency: string, customer: any, returnUrl: string, cancelUrl: string, responseUrl: string) {
    const pluginName = 'customapi';
    const pluginVersion = '1.0.1';
    const reference = orderId;
    const description = `Order ${orderId}`;
    const amountStr = amount.toFixed(2);
    
    const dataString = `${this.merchantId}${amountStr}${currency}${pluginName}${pluginVersion}${returnUrl}${cancelUrl}${orderId}${reference}${customer.firstName || 'Customer'}${customer.lastName || 'Name'}${customer.email || 'customer@example.com'}${description}${this.apiKey}${responseUrl}`;
    
    const signature = this.sign(dataString);
    
    return {
      url: `${this.apiUrl}/api/merchants/orderCreate`,
      params: {
        _mId: this.merchantId,
        api_key: this.apiKey,
        _returnUrl: returnUrl,
        _cancelUrl: cancelUrl,
        _responseUrl: responseUrl,
        _amount: amountStr,
        _currency: currency,
        _reference: reference,
        _orderId: orderId,
        _pluginName: pluginName,
        _pluginVersion: pluginVersion,
        _description: description,
        _firstName: customer.firstName || 'Customer',
        _lastName: customer.lastName || 'Name',
        _email: customer.email || 'customer@example.com',
        dataString,
        signature
      }
    };
  }

  verifyWebhook(payload: any): { success: boolean; orderId: string; status: string; trnId?: string } {
    const { orderId, trnId, status, signature } = payload;
    
    if (!orderId || !status || !signature) {
       throw new Error('Invalid webhook payload from Koko');
    }

    const dataString = `${orderId}${trnId || ''}${status}`;
    
    const isValid = this.verify(dataString, signature);
    if (!isValid) {
      throw new Error('Invalid Koko webhook signature');
    }

    return {
      success: true,
      orderId,
      trnId,
      status
    };
  }
}

export const kokoProvider = new KokoProvider();
