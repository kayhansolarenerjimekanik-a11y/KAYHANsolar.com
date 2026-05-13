export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  stockQuantity: number;
  hasFreeShipping: boolean;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  detailedAddress: string;
}
