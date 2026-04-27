export type UserRole = "ADMIN" | "CLIENT";

export interface Product {
  id: string;
  name: string;
  description: string;
  priceFcfa: number;
  imageUrl: string;
  stock: number;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface MobileMoneyPayment {
  amountFcfa: number;
  phoneNumber: string;
  provider: "MOOV" | "TOGOCEL";
}
