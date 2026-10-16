import mongoose from "mongoose";
import QueueEntry, { IQueueEntry } from "../models/QueueEntry";
import User from "../models/User";

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

export interface BusinessAnalyticsResult {
  range: string;
  summary: AnalyticsSummary;
  dailyThroughput: DailyThroughputItem[];
  peakHours: PeakHourItem[];
  servicePopularity: ServicePopularityItem[];
}

/**
 * Calculates authoritative operational analytics for a given merchant
 * @param businessId - Merchant user ID
 * @param range - "today" | "7d" | "30d" | "all"
 * @param startDate - Optional ISO string for custom range start
 * @param endDate - Optional ISO string for custom range end
 */
export const getBusinessAnalyticsService = async (
  businessId: string,
  range: string = "7d",
  startDate?: string,
  endDate?: string
): Promise<BusinessAnalyticsResult> => {
  const businessObjectId = new mongoose.Types.ObjectId(businessId);
  const now = new Date();

  // Determine date filtering interval
  let startBoundary: Date | null = null;
  let endBoundary: Date = now;

  if (startDate) {
    startBoundary = new Date(startDate);
    if (endDate) {
      endBoundary = new Date(endDate);
    }
  } else if (range === "today") {
    startBoundary = new Date(now);
    startBoundary.setHours(0, 0, 0, 0);
  } else if (range === "7d") {
    startBoundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startBoundary.setHours(0, 0, 0, 0);
  } else if (range === "30d") {
    startBoundary = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startBoundary.setHours(0, 0, 0, 0);
  } else {
    // "all"
    startBoundary = null;
  }

  const queryFilter: any = { businessId: businessObjectId };
  if (startBoundary) {
    queryFilter.joinedAt = { $gte: startBoundary, $lte: endBoundary };
  }

  // Fetch entries for this merchant in the given time frame
  const entries = await QueueEntry.find(queryFilter).sort({ joinedAt: 1 });

  let totalCompleted = 0;
  let totalCancelled = 0;
  let totalActive = 0;
  let totalRevenue = 0;

  let totalWaitTimeMs = 0;
  let waitCount = 0;

  let totalServiceDurationMin = 0;
  let totalEstimatedDurationMin = 0;
  let serviceCount = 0;

  // Hourly counts array for 24 hours
  const hourlyCounts = new Array(24).fill(0);

  // Daily throughput mapping: key is "YYYY-MM-DD"
  const dailyMap = new Map<string, { completed: number; cancelled: number; revenue: number }>();

  // If 7d or 30d, pre-populate all dates so there are no gaps in charts
  if (startBoundary && (range === "7d" || range === "30d" || range === "today")) {
    const iter = new Date(startBoundary);
    while (iter <= endBoundary) {
      const ymd = iter.toISOString().slice(0, 10);
      dailyMap.set(ymd, { completed: 0, cancelled: 0, revenue: 0 });
      iter.setDate(iter.getDate() + 1);
    }
  }

  // Popularity map: key is service name
  const serviceStatsMap = new Map<string, { count: number; revenue: number }>();

  for (const entry of entries) {
    const joined = new Date(entry.joinedAt || entry.date || entry.createdAt);
    const hour = joined.getHours();
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;

    const ymd = joined.toISOString().slice(0, 10);
    let dailyStat = dailyMap.get(ymd);
    if (!dailyStat) {
      dailyStat = { completed: 0, cancelled: 0, revenue: 0 };
      dailyMap.set(ymd, dailyStat);
    }

    // Cost of this ticket's services
    const ticketCost = (entry.selectedServices || []).reduce((acc, s) => acc + (s.cost || 0), 0);

    if (entry.status === "completed") {
      totalCompleted++;
      totalRevenue += ticketCost;
      dailyStat.completed++;
      dailyStat.revenue += ticketCost;

      // Track service actual vs estimated duration
      const actualDuration =
        entry.actualServiceDurationMin !== undefined && entry.actualServiceDurationMin > 0
          ? entry.actualServiceDurationMin
          : entry.serviceStartedAt && entry.completedAt
          ? Math.max(1, Math.round((new Date(entry.completedAt).getTime() - new Date(entry.serviceStartedAt).getTime()) / 60000))
          : entry.totalEstimatedTime || 10;

      totalServiceDurationMin += actualDuration;
      totalEstimatedDurationMin += entry.totalEstimatedTime || actualDuration;
      serviceCount++;

      // Track wait time
      if (entry.serviceStartedAt) {
        const waitMs = new Date(entry.serviceStartedAt).getTime() - joined.getTime();
        if (waitMs > 0) {
          totalWaitTimeMs += waitMs;
          waitCount++;
        }
      } else if (entry.completedAt) {
        const waitMs = new Date(entry.completedAt).getTime() - joined.getTime();
        if (waitMs > 0) {
          totalWaitTimeMs += Math.max(0, waitMs - actualDuration * 60000);
          waitCount++;
        }
      }
    } else if (entry.status === "cancelled") {
      totalCancelled++;
      dailyStat.cancelled++;
    } else if (entry.status === "waiting" || entry.status === "in_progress") {
      totalActive++;

      if (entry.status === "in_progress" && entry.serviceStartedAt) {
        const waitMs = new Date(entry.serviceStartedAt).getTime() - joined.getTime();
        if (waitMs > 0) {
          totalWaitTimeMs += waitMs;
          waitCount++;
        }
      }
    }

    // Accumulate service popularity (for completed or all booked services)
    if (entry.selectedServices && entry.selectedServices.length > 0) {
      for (const service of entry.selectedServices) {
        const existing = serviceStatsMap.get(service.name) || { count: 0, revenue: 0 };
        existing.count++;
        if (entry.status === "completed") {
          existing.revenue += service.cost || 0;
        }
        serviceStatsMap.set(service.name, existing);
      }
    }
  }

  // Calculate averages & rates
  const totalCustomers = entries.length;
  const resolved = totalCompleted + totalCancelled;
  const completionRate = resolved > 0 ? Math.round((totalCompleted / resolved) * 100) : 100;
  const avgWaitTimeMin = waitCount > 0 ? Math.round(totalWaitTimeMs / waitCount / 60000) : 0;
  const avgServiceDurationMin = serviceCount > 0 ? Math.round(totalServiceDurationMin / serviceCount) : 0;
  const serviceSpeedRatio =
    totalEstimatedDurationMin > 0 && totalServiceDurationMin > 0
      ? Number((totalServiceDurationMin / totalEstimatedDurationMin).toFixed(2))
      : 1.0;

  // Format Daily Throughput
  const dailyThroughput: DailyThroughputItem[] = Array.from(dailyMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, data]) => {
      const d = new Date(`${date}T00:00:00Z`);
      const label = d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: "short",
        month: "short",
        day: "numeric"
      });
      return {
        date,
        label,
        completed: data.completed,
        cancelled: data.cancelled,
        revenue: data.revenue
      };
    });

  // Format Peak Hours
  const peakHours: PeakHourItem[] = hourlyCounts.map((count, hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return {
      hour,
      label: `${displayHour} ${period}`,
      count
    };
  });

  // Format Service Popularity Breakdown
  const totalBookings = Array.from(serviceStatsMap.values()).reduce((sum, item) => sum + item.count, 0);
  const servicePopularity: ServicePopularityItem[] = Array.from(serviceStatsMap.entries())
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      revenue: stats.revenue,
      percentage: totalBookings > 0 ? Math.round((stats.count / totalBookings) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  return {
    range,
    summary: {
      totalCustomers,
      totalCompleted,
      totalCancelled,
      totalActive,
      completionRate,
      totalRevenue,
      avgWaitTimeMin,
      avgServiceDurationMin,
      serviceSpeedRatio
    },
    dailyThroughput,
    peakHours,
    servicePopularity
  };
};
