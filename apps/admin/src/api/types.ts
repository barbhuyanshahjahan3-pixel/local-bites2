export interface AdminOrder {
  _id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  rejectedBy?: string;
  deliveryPartner: string | null;
  createdAt: string;
}

export interface AdminRestaurant {
  _id: string;
  restaurantId: string;
  name: string;
  address: string;
  contactPhone: string;
  isOpen: boolean;
  cuisineTags: string[];
  isFeatured?: boolean;
  featuredOrder?: number;
}

export interface AdminDeliveryPartner {
  _id: string;
  partnerId: string;
  name: string;
  mobile: string;
  vehicleType: string;
  isOnline: boolean;
  isDisabled: boolean;
}

export interface AdminCustomer {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
}

export interface Complaint {
  _id: string;
  customer: string;
  subject: string;
  description: string;
  status: string;
  resolutionNote?: string;
  createdAt: string;
}

export interface OrderAnalytics {
  orderCount: number;
  delivered: number;
  cancelled: number;
  rejected: number;
  rejectedByRestaurant: number;
  rejectedByDelivery: number;
  revenue: number;
  platformCommission: number;
  deliveryCharges: number;
  profitAndLoss: number;
}

export interface PerformanceRow {
  name: string;
  orderCount?: number;
  deliveries?: number;
  revenue?: number;
  commission?: number;
  earnings?: number;
}
