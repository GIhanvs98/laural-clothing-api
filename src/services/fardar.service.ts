import axios from 'axios';

export interface ShippingDetails {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress1: string;
  customerAddress2: string;
  customerAddress3: string;
  city: string;
  district: string;
  weightKg?: number;
  codAmount?: number;
}

export interface FardarShipmentResponse {
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  message?: string;
}

/**
 * FardarService is an abstraction layer for the Fardar Courier API.
 */
export const FardarService = {
  async createShipment(details: ShippingDetails): Promise<FardarShipmentResponse> {
    console.log('[FardarService] Creating shipment for order:', details.orderId);
    
    const apiUrl = process.env.FARDAR_API_URL;
    const apiKey = process.env.FARDAR_API_KEY;
    const clientId = process.env.FARDAR_CLIENT_ID;

    if (!apiUrl || !apiKey || !clientId) {
      console.warn('[FardarService] Missing FARDAR credentials. Falling back to mock.');
      return this.mockCreateShipment();
    }

    try {
      const data = new URLSearchParams();
      data.append('client_id', clientId);
      data.append('api_key', apiKey);
      data.append('order_id', details.orderId);
      data.append('parcel_weight', (details.weightKg || 1).toString());
      data.append('parcel_description', `Order ${details.orderId}`);
      data.append('recipient_name', details.customerName);
      data.append('recipient_contact_1', details.customerPhone);
      
      // Combine address lines for Fardar's single recipient_address field
      const fullAddress = [details.customerAddress1, details.customerAddress2, details.customerAddress3, details.district]
        .filter(Boolean)
        .join(', ');
      
      data.append('recipient_address', fullAddress);
      data.append('recipient_city', details.city);
      data.append('amount', (details.codAmount || 0).toString());
      data.append('exchange', '0');

      console.log('[FardarService] REQUEST URL:', `${apiUrl}/new_api_v1.php`);
      console.log(
        '[FardarService] REQUEST DATA:',
        Object.fromEntries(data.entries())
      );

      const response = await axios.post(
        `${apiUrl}/new_api_v1.php`,
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log(
        '[FardarService] RESPONSE:',
        JSON.stringify(response.data, null, 2)
      );

      const trackingId = response.data?.waybill_id || response.data?.waybill_no;
      const status = String(response.data?.status);

      if (status === '200' && trackingId) {
        return {
          success: true,
          trackingNumber: trackingId,
          message: 'Shipment created successfully'
        };
      } else {
        return {
          success: false,
          message: `Fardar API Error: ${JSON.stringify(response.data)}`
        };
      }
    } catch (error: any) {
      console.error('[FardarService] API Error creating shipment:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create Fardar shipment'
      };
    }
  },

  async trackShipment(trackingNumber: string) {
    console.log('[FardarService] Tracking shipment:', trackingNumber);
    
    const apiUrl = process.env.FARDAR_API_URL;
    const apiKey = process.env.FARDAR_API_KEY;
    const clientId = process.env.FARDAR_CLIENT_ID;

    if (!apiUrl || !apiKey || !clientId) {
      return this.mockTrackShipment(trackingNumber);
    }

    try {
      const data = new URLSearchParams();
      data.append('client_id', clientId);
      data.append('api_key', apiKey);
      data.append('waybill_id', trackingNumber);

      const response = await axios.post(`${apiUrl}/existing_waybill_api_v1.php`, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        trackingNumber,
        status: response.data?.status,
        lastUpdated: new Date().toISOString(),
        location: 'Unknown'
      };
    } catch (error: any) {
      console.error('[FardarService] API Error tracking shipment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to track Fardar shipment');
    }
  },

  // Fallbacks for local testing without keys
  async mockCreateShipment(): Promise<FardarShipmentResponse> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const trackingNumber = `FDR-${Math.floor(Math.random() * 1000000)}`;
    const labelUrl = `https://mock-fardar-api.com/labels/${trackingNumber}.pdf`;
    return {
      success: true,
      trackingNumber,
      labelUrl,
      message: 'Shipment created successfully (Mock)'
    };
  },

  async mockTrackShipment(trackingNumber: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const statuses = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      trackingNumber,
      status: randomStatus,
      lastUpdated: new Date().toISOString(),
      location: 'Colombo Sorting Center (Mock)'
    };
  }
};
