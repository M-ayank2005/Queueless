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
  timezone?: string;
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
  favoriteBusinesses?: string[];
}

export interface FavoriteStore {
  _id: string;
  name?: string;
  shopName?: string;
  email?: string;
  qrCode?: string;
  uniqueQrCode?: string;
  businessProfile?: {
    shopName?: string;
    address?: string;
    uniqueQrCode?: string;
    services?: ServiceItem[];
  };
  isOpen: boolean;
  openReason?: string;
  activeQueueCount: number;
  estimatedWait: number;
  prediction?: PredictionMetadata;
}

export interface PredictionMetadata {
  speedRatio?: number;
  confidence?: "standard" | "medium" | "high";
  confidenceLabel?: string;
  minWaitMin?: number;
  maxWaitMin?: number;
  rangeDisplay?: string;
  sampleSize?: number;
}

export interface QueueAlertData {
  active: boolean;
  type: "TURN_APPROACHING" | "YOUR_TURN";
  title: string;
  message: string;
}

export interface QueueEntry {
  _id: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  selectedServices: ServiceItem[];
  date: string;
  joinedAt?: string;
  updatedAt?: string;
  customerName?: string;
  peopleAhead?: number;
  currentEstimatedWait?: number;
  estimatedServiceStartTime?: string;
  prediction?: PredictionMetadata;
  alert?: QueueAlertData;
  businessId?: any;
  customerId?: any;
  shareToken?: string;
}

export interface AnalyticsSummary {
  totalCustomers: number;
  totalCompleted: number;
  totalCancelled: number;
  totalActive: number;
  completionRate: number;
  totalRevenue: number;
  avgWaitTimeMin: number;
  avgServiceDurationMin: number;
  serviceSpeedRatio: number;
}

export interface DailyThroughputItem {
  date: string;
  label: string;
  completed: number;
  cancelled: number;
  revenue: number;
}

export interface PeakHourItem {
  hour: number;
  label: string;
  count: number;
}

export interface ServicePopularityItem {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface BusinessAnalytics {
  range: string;
  summary: AnalyticsSummary;
  dailyThroughput: DailyThroughputItem[];
  peakHours: PeakHourItem[];
  servicePopularity: ServicePopularityItem[];
}

export interface SharedTicketData {
  ticketNumber: string;
  status: "waiting" | "in_progress" | "completed" | "cancelled" | string;
  shopName: string;
  shopAddress: string;
  joinedAt: string;
  selectedServices: Array<{
    name: string;
    durationMin: number;
    cost?: number;
  }>;
  peopleAhead: number;
  currentEstimatedWait: number;
  estimatedServiceStartTime?: string;
  prediction?: PredictionMetadata;
  shareToken: string;
}
