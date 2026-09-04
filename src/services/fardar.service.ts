import axios from 'axios';

export interface ShippingDetails {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
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

    if (!apiUrl || !apiKey) {
      console.warn('[FardarService] Missing FARDAR_API_URL or FARDAR_API_KEY. Falling back to mock.');
      return this.mockCreateShipment();
    }

    try {
      const response = await axios.post(
        `${apiUrl}/shipments`,
        {
          reference: details.orderId,
          recipient_name: details.customerName,
          recipient_phone: details.customerPhone,
          recipient_address: details.customerAddress,
          recipient_city: details.city,
          weight: details.weightKg || 1,
          cod_amount: details.codAmount || 0,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        trackingNumber: response.data.tracking_number,
        labelUrl: response.data.label_url,
        message: 'Shipment created successfully'
      };
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

    if (!apiUrl || !apiKey) {
      return this.mockTrackShipment(trackingNumber);
    }

    try {
      const response = await axios.get(`${apiUrl}/shipments/${trackingNumber}/track`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      return {
        trackingNumber,
        status: response.data.status,
        lastUpdated: response.data.updated_at,
        location: response.data.location
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
