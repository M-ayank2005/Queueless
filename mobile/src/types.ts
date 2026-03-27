export type UserRole = "customer" | "business";

export interface ServiceItem {
  name: string;
  durationMin: number;
  cost: number;
}

export interface WorkingHours {
  openTime: string;
  closeTime: string;
  closedDays: number[];
}

export interface BusinessProfile {
  shopName: string;
  address: string;
  uniqueQrCode: string;
  services: ServiceItem[];
  workingHours?: WorkingHours;
}

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  businessProfile?: BusinessProfile;
}

export interface QueueEntry {
  _id: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  selectedServices: ServiceItem[];
  date: string;
  joinedAt?: string;
  peopleAhead?: number;
  currentEstimatedWait?: number;
  businessId?: any;
  customerId?: any;
}
