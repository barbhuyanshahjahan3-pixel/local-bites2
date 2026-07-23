export interface Category {
  _id: string;
  name: string;
  restaurant: string;
}

export interface Food {
  _id: string;
  category: string | Category;
  name: string;
  description?: string;
  price: number;
  offerPrice: number | null;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  images?: { url: string; publicId: string }[];
}

export interface OrderItem {
  food: string;
  name: string;
  price: number;
  quantity: number;
}

export interface RestaurantOrder {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  itemsTotal: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: 'cod' | 'online';
  paymentStatus: string;
  status: string;
  createdAt: string;
}

export interface SalesReport {
  orderCount: number;
  totalRevenue: number;
  totalCommission: number;
  netPayout: number;
}
