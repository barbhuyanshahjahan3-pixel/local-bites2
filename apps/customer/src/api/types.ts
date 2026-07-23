export interface City {
  _id: string;
  name: string;
  state: string;
}

export interface RestaurantSummary {
  _id: string;
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  avgRating: number;
  ratingCount: number;
  cuisineTags: string[];
  city: string;
  isFeatured?: boolean;
  featuredOrder?: number;
}

export interface Category {
  _id: string;
  name: string;
}

export interface Food {
  _id: string;
  restaurant: string | { _id: string; name: string; city: string; isOpen: boolean };
  category: Category | string;
  name: string;
  description?: string;
  price: number;
  offerPrice: number | null;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  images?: { url: string; publicId: string }[];
  avgRating: number;
}

export interface RestaurantDetail {
  _id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  galleryImages?: { url: string; publicId: string }[];
  lat?: number;
  lng?: number;
  avgRating: number;
  ratingCount: number;
  cuisineTags: string[];
  address: string;
  city: string;
  isOpen: boolean;
}

export interface CartLine {
  food: Food;
  quantity: number;
}

export interface OrderSummary {
  _id: string;
  orderNumber: string;
  items: { name: string; price: number; quantity: number }[];
  itemsTotal: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: 'cod' | 'online';
  paymentStatus: string;
  status: string;
  restaurant: string;
  createdAt: string;
}

export interface Complaint {
  _id: string;
  subject: string;
  description: string;
  status: string;
  resolutionNote?: string;
  createdAt: string;
}
