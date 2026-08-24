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
 * Currently uses mock responses since real API keys/endpoints are not provided.
 */
export const FardarService = {
  async createShipment(details: ShippingDetails): Promise<FardarShipmentResponse> {
    console.log('[FardarService] Creating shipment for order:', details.orderId);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock successful response
    const trackingNumber = `FDR-${Math.floor(Math.random() * 1000000)}`;
    const labelUrl = `https://mock-fardar-api.com/labels/${trackingNumber}.pdf`;

    return {
      success: true,
      trackingNumber,
      labelUrl,
      message: 'Shipment created successfully'
    };
  },

  async trackShipment(trackingNumber: string) {
    console.log('[FardarService] Tracking shipment:', trackingNumber);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const statuses = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      trackingNumber,
      status: randomStatus,
      lastUpdated: new Date().toISOString(),
      location: 'Colombo Sorting Center'
    };
  }
};
