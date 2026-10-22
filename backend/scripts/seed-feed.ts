import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User";
import QueueEntry from "../src/models/QueueEntry";
import Notification from "../src/models/Notification";
import Update from "../src/models/Update";

dotenv.config();

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run seed script in production environment.");
  process.exit(1);
}

const runSeed = async () => {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/queueless";
  console.log(`Connecting to MongoDB: ${mongoUri.replace(/:([^:@]{3,})@/, ":***@")}`);
  await mongoose.connect(mongoUri);

  const customerEmail = (process.argv[2] || "customer@example.com").toLowerCase().trim();
  console.log(`Seeding notification & update feed for customer: ${customerEmail}`);

  // 1. Find or create test customer
  let customer = await User.findOne({ email: customerEmail });
  if (!customer) {
    customer = await User.create({
      name: "Alex Johnson",
      email: customerEmail,
      phone: "+919876543210",
      passwordHash: "$2b$10$abcdefghijklmnopqrstuv", // dummy hash
      role: "customer",
      favoriteBusinesses: [],
    });
    console.log(`Created test customer: ${customer.email} (${customer._id})`);
  }

  // 2. Find or create businesses matching Figma design
  const storeDefinitions = [
    {
      name: "Smile Dental Care Owner",
      email: "smiledental@example.com",
      phone: "+919876543211",
      shopName: "Smile Dental Care",
      address: "123 Healthcare Ave, Suite 4",
      qr: "STORE-SMILE-DENTAL",
    },
    {
      name: "City Bank Branch Manager",
      email: "citybank@example.com",
      phone: "+919876543212",
      shopName: "City Bank",
      address: "45 Financial Blvd, Downtown",
      qr: "STORE-CITY-BANK",
    },
    {
      name: "HealthPlus Owner",
      email: "healthplus@example.com",
      phone: "+919876543213",
      shopName: "HealthPlus Pharmacy",
      address: "78 Medical Market, Block C",
      qr: "STORE-HEALTHPLUS",
    },
    {
      name: "Glow Salon Manager",
      email: "glowsalon@example.com",
      phone: "+919876543214",
      shopName: "Glow Beauty Salon",
      address: "12 Style Street, Trend Plaza",
      qr: "STORE-GLOW-SALON",
    },
  ];

  const businessMap: Record<string, any> = {};

  for (const def of storeDefinitions) {
    let biz = await User.findOne({ email: def.email });
    if (!biz) {
      biz = await User.create({
        name: def.name,
        email: def.email,
        phone: def.phone,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
        role: "business",
        businessProfile: {
          shopName: def.shopName,
          address: def.address,
          uniqueQrCode: def.qr,
          services: [
            { name: "General Consultation", durationMin: 15, cost: 200 },
            { name: "Specialized Service", durationMin: 30, cost: 500 },
          ],
          workingHours: {
            openTime: "09:00",
            closeTime: "20:00",
            closedDays: [],
            timezone: "Asia/Kolkata",
          },
        },
      });
      console.log(`Created store: ${def.shopName} (${biz._id})`);
    }
    businessMap[def.shopName] = biz;
  }

  // 3. Ensure customer has favorited these stores so visibility rule passes
  const bizIds = Object.values(businessMap).map((b) => b._id);
  await User.findByIdAndUpdate(customer._id, {
    $addToSet: { favoriteBusinesses: { $each: bizIds } },
  });

  // 4. Create sample recent QueueEntry so queue visibility rule also passes
  const existingEntry = await QueueEntry.findOne({ customerId: customer._id });
  if (!existingEntry) {
    await QueueEntry.create({
      customerId: customer._id,
      businessId: businessMap["Smile Dental Care"]._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      selectedServices: [{ name: "Dental Checkup", durationMin: 15, cost: 300 }],
      totalDurationMin: 15,
      totalCost: 300,
      ticketNumber: "T-101",
      tokenNumber: 101,
      status: "waiting",
      date: new Date(),
      joinedAt: new Date(),
    });
  }

  // 5. Clean up previous seed notifications & updates for idempotence
  await Notification.deleteMany({ userId: customer._id });
  await Update.deleteMany({ businessId: { $in: bizIds } });

  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;

  // 6. Seed Notifications
  // (1) "Your turn is near" (Smile Dental Care, Today)
  const notif1 = new Notification({
    userId: customer._id,
    type: "turn_near",
    title: "Your turn is near",
    message: "Please arrive at Smile Dental Care and check in at reception.",
    businessId: businessMap["Smile Dental Care"]._id,
    meta: {
      shopName: "Smile Dental Care",
      waitMin: 5,
    },
    dedupeKey: `seed:turn_near:${customer._id}`,
    readAt: null,
  });
  notif1.createdAt = new Date(now - 15 * 60 * 1000); // 15 mins ago (Today)
  await notif1.save();

  // (2) "Queue updated" (City Bank, Yesterday, position 1, 5 min wait)
  const notif2 = new Notification({
    userId: customer._id,
    type: "queue_updated",
    title: "Queue updated",
    message: "Your queue has moved at City Bank.",
    businessId: businessMap["City Bank"]._id,
    meta: {
      shopName: "City Bank",
      position: 1,
      waitMin: 5,
    },
    dedupeKey: `seed:queue_updated:${customer._id}`,
    readAt: null,
  });
  notif2.createdAt = new Date(now - (dayMs + 2 * 3600 * 1000)); // Yesterday
  await notif2.save();

  // (3) "Joined queue" (HealthPlus Pharmacy, 3 days ago)
  const notif3 = new Notification({
    userId: customer._id,
    type: "joined",
    title: "Joined queue",
    message: "You are successfully added to the queue at HealthPlus Pharmacy.",
    businessId: businessMap["HealthPlus Pharmacy"]._id,
    meta: {
      shopName: "HealthPlus Pharmacy",
    },
    dedupeKey: `seed:joined:${customer._id}`,
    readAt: new Date(now - 2 * dayMs),
  });
  notif3.createdAt = new Date(now - 3 * dayMs); // 3 days ago
  await notif3.save();

  console.log("Seeded 3 design-matching notifications (Today, Yesterday, 3 days ago)");

  // 7. Seed Updates
  // (1) "Holiday Notice" (alert, Smile Dental Care, Today)
  const update1 = new Update({
    businessId: businessMap["Smile Dental Care"]._id,
    type: "alert",
    title: "Holiday Notice",
    message: "Closed on Sunday due to public holiday.",
    expiresAt: new Date(now + 30 * dayMs),
  });
  update1.createdAt = new Date(now - 30 * 60 * 1000); // 30 mins ago (Today)
  await update1.save();

  // (2) "Special Offer" (offer, Glow Beauty Salon, Yesterday)
  const validTillOffer = new Date(now + 10 * dayMs);
  const update2 = new Update({
    businessId: businessMap["Glow Beauty Salon"]._id,
    type: "offer",
    title: "Special Offer",
    message: "Flat 20% off on hair spa this week.",
    validTill: validTillOffer,
    expiresAt: validTillOffer,
  });
  update2.createdAt = new Date(now - (dayMs + 3600 * 1000)); // Yesterday
  await update2.save();

  // (3) "Service Update" (info, City Bank, 3 days ago)
  const update3 = new Update({
    businessId: businessMap["City Bank"]._id,
    type: "info",
    title: "Service Update",
    message: "New token system available for faster service.",
    expiresAt: new Date(now + 27 * dayMs),
  });
  update3.createdAt = new Date(now - 3 * dayMs); // 3 days ago
  await update3.save();

  console.log("Seeded 3 design-matching updates (Alert / Offer / Info)");
  console.log("Feed seeding completed successfully!");

  await mongoose.disconnect();
};

runSeed().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
