import mongoose from "mongoose";
import QueueEntry from "../models/QueueEntry";
import { getBusinessAnalyticsService } from "../services/analyticsService";

jest.mock("../models/QueueEntry");
jest.mock("../models/User");

describe("Business Analytics Service — Unit Tests", () => {
  const dummyBusinessId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return clean zero metrics when no entries exist", async () => {
    const mockQuery = {
      sort: jest.fn().mockResolvedValue([])
    };
    (QueueEntry.find as jest.Mock).mockReturnValue(mockQuery);

    const result = await getBusinessAnalyticsService(dummyBusinessId, "7d");

    expect(result.summary.totalCustomers).toBe(0);
    expect(result.summary.totalCompleted).toBe(0);
    expect(result.summary.totalCancelled).toBe(0);
    expect(result.summary.totalActive).toBe(0);
    expect(result.summary.completionRate).toBe(100);
    expect(result.summary.totalRevenue).toBe(0);
    expect(result.summary.avgWaitTimeMin).toBe(0);
    expect(result.summary.avgServiceDurationMin).toBe(0);
    expect(result.summary.serviceSpeedRatio).toBe(1.0);
    expect(result.servicePopularity).toHaveLength(0);
    expect(result.peakHours).toHaveLength(24);
  });

  it("should aggregate completed and cancelled tickets with accurate averages and popularity", async () => {
    const baseTime = new Date("2026-10-16T10:00:00Z");

    const mockEntries = [
      // Completed ticket 1: Haircut ($30, 20 mins actual, waited 10 mins)
      {
        status: "completed",
        joinedAt: new Date(baseTime.getTime() - 30 * 60000), // 09:30
        serviceStartedAt: new Date(baseTime.getTime() - 20 * 60000), // 09:40 (waited 10 mins)
        completedAt: new Date(baseTime.getTime()), // 10:00 (served 20 mins)
        actualServiceDurationMin: 20,
        totalEstimatedTime: 25,
        selectedServices: [{ name: "Haircut", durationMin: 25, cost: 30 }]
      },
      // Completed ticket 2: Haircut + Beard ($45, 30 mins actual, waited 20 mins)
      {
        status: "completed",
        joinedAt: new Date(baseTime.getTime() - 50 * 60000), // 09:10
        serviceStartedAt: new Date(baseTime.getTime() - 30 * 60000), // 09:30 (waited 20 mins)
        completedAt: new Date(baseTime.getTime()), // 10:00 (served 30 mins)
        actualServiceDurationMin: 30,
        totalEstimatedTime: 35,
        selectedServices: [
          { name: "Haircut", durationMin: 25, cost: 30 },
          { name: "Beard Trim", durationMin: 10, cost: 15 }
        ]
      },
      // Cancelled ticket: Customer left line
      {
        status: "cancelled",
        joinedAt: new Date(baseTime.getTime() - 15 * 60000),
        selectedServices: [{ name: "Shave", durationMin: 15, cost: 20 }]
      },
      // Active waiting ticket
      {
        status: "waiting",
        joinedAt: new Date(baseTime.getTime() - 5 * 60000),
        selectedServices: [{ name: "Haircut", durationMin: 25, cost: 30 }]
      }
    ];

    const mockQuery = {
      sort: jest.fn().mockResolvedValue(mockEntries)
    };
    (QueueEntry.find as jest.Mock).mockReturnValue(mockQuery);

    const result = await getBusinessAnalyticsService(dummyBusinessId, "7d");

    // Total counts
    expect(result.summary.totalCustomers).toBe(4);
    expect(result.summary.totalCompleted).toBe(2);
    expect(result.summary.totalCancelled).toBe(1);
    expect(result.summary.totalActive).toBe(1);

    // Completion Rate: 2 / (2 + 1) = 67%
    expect(result.summary.completionRate).toBe(67);

    // Total revenue: $30 + $45 = $75
    expect(result.summary.totalRevenue).toBe(75);

    // Avg Wait Time: (10 + 20) / 2 = 15 mins
    expect(result.summary.avgWaitTimeMin).toBe(15);

    // Avg Service Duration: (20 + 30) / 2 = 25 mins
    expect(result.summary.avgServiceDurationMin).toBe(25);

    // Service Speed Ratio: total actual 50 / total estimated 60 = 0.83
    expect(result.summary.serviceSpeedRatio).toBe(0.83);

    // Service popularity breakdown: Haircut should be #1 (booked 3 times)
    expect(result.servicePopularity.length).toBeGreaterThanOrEqual(2);
    expect(result.servicePopularity[0].name).toBe("Haircut");
    expect(result.servicePopularity[0].count).toBe(3);
    expect(result.servicePopularity[0].revenue).toBe(60); // 2 completed tickets included Haircut ($30 each)
  });

  it("should respect date boundaries for range='today' and custom date filters", async () => {
    const mockQuery = {
      sort: jest.fn().mockResolvedValue([])
    };
    (QueueEntry.find as jest.Mock).mockReturnValue(mockQuery);

    await getBusinessAnalyticsService(dummyBusinessId, "today");
    expect(QueueEntry.find).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: expect.any(mongoose.Types.ObjectId),
        joinedAt: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date)
        })
      })
    );

    // Custom date filter
    await getBusinessAnalyticsService(
      dummyBusinessId,
      "custom",
      "2026-10-01T00:00:00Z",
      "2026-10-07T23:59:59Z"
    );
    expect(QueueEntry.find).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: expect.any(mongoose.Types.ObjectId),
        joinedAt: {
          $gte: new Date("2026-10-01T00:00:00Z"),
          $lte: new Date("2026-10-07T23:59:59Z")
        }
      })
    );
  });
});
