export interface FaqItem {
  id: string;
  category: "queues" | "verification" | "editing" | "business" | "privacy" | "support";
  categoryLabel: string;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "queues", label: "Queues & Tickets" },
  { id: "verification", label: "Counter Verification" },
  { id: "editing", label: "Service Quantities & Edits" },
  { id: "business", label: "Store Management" },
  { id: "privacy", label: "Privacy & Security" },
  { id: "support", label: "Support & Contact" }
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "join-queue",
    category: "queues",
    categoryLabel: "Queues & Tickets",
    question: "How do I join a queue at a participating store?",
    answer: "You can join a queue by scanning the store's unique QR code at their counter or storefront, or by visiting their direct store link. Once on the store page, select the services you need, specify quantities, and tap 'Join Queue'."
  },
  {
    id: "track-status",
    category: "queues",
    categoryLabel: "Queues & Tickets",
    question: "How can I check how many people are ahead of me?",
    answer: "Your live ticket screen displays your current queue status in real time, including the exact number of people ahead of you and a dynamic estimated waiting time calculated from live counter pace."
  },
  {
    id: "leave-queue",
    category: "queues",
    categoryLabel: "Queues & Tickets",
    question: "Can I cancel my ticket if I can no longer make it?",
    answer: "Yes. From your live ticket status page, tap 'Cancel Ticket' to voluntarily leave the line. This immediately updates the queue and moves everyone behind you forward."
  },
  {
    id: "ticket-sharing",
    category: "queues",
    categoryLabel: "Queues & Tickets",
    question: "How do I share my live ticket status with someone else?",
    answer: "Tap 'Share Live Status' on your ticket page. This generates a secure, time-limited link that friends or family can view to follow your wait time without accessing your private account."
  },
  {
    id: "verification-qr",
    category: "verification",
    categoryLabel: "Counter Verification",
    question: "What is the Counter Verification QR code?",
    answer: "Each ticket has an encrypted, unique verification token and QR code. When your turn is called at the counter, show this QR code (or your 6-character Ticket ID) to store staff so they can verify that the spot belongs to you."
  },
  {
    id: "counter-privacy",
    category: "verification",
    categoryLabel: "Counter Verification",
    question: "Does the Counter Verification QR code reveal my personal data?",
    answer: "No. The QR code contains an opaque, cryptographically generated token (no passwords, phone numbers, or emails are encoded) to protect your privacy while waiting."
  },
  {
    id: "service-quantities",
    category: "editing",
    categoryLabel: "Service Quantities & Edits",
    question: "Can I request multiple quantities of the same service (e.g., haircuts for family)?",
    answer: "Yes! Use the [-] and [+] stepper buttons when selecting services to specify quantities (up to 50 per service). Total durations and estimated waits automatically adjust to accommodate your party."
  },
  {
    id: "edit-services",
    category: "editing",
    categoryLabel: "Service Quantities & Edits",
    question: "Can I change my requested services while already waiting in line?",
    answer: "Yes! If you scan the store's QR code again or tap 'Edit Requested Services' on your live status page, you can update your service items and counts without losing your place in line."
  },
  {
    id: "business-setup",
    category: "business",
    categoryLabel: "Store Management",
    question: "How do businesses set up their queue and services?",
    answer: "Store owners register a business account, set their operating hours and timezone, and enter their service catalog with estimated durations and prices in their business dashboard."
  },
  {
    id: "business-contact",
    category: "business",
    categoryLabel: "Store Management",
    question: "How does a merchant contact customers who are in line?",
    answer: "From the merchant dashboard, clicking on any customer entry opens a card with direct 'Call Customer' (tel:) and 'SMS / Text' (sms:) buttons to alert them when their turn is approaching."
  },
  {
    id: "payments-refunds",
    category: "business",
    categoryLabel: "Store Management",
    question: "Does QueueLess process payments or refunds online?",
    answer: "No. QueueLess manages queue reservations and waiting flow. All service pricing is settled in person directly with the business counter. Any refunds or billing queries are handled in person by the merchant."
  },
  {
    id: "ai-privacy",
    category: "privacy",
    categoryLabel: "Privacy & Security",
    question: "How does QueueLess AI Support handle my account information?",
    answer: "AI Support accesses only the authenticated user's own active tickets and public store details to answer questions. Your messages are processed securely by Google Gemini under strict data minimization. Passwords, hashes, and other users' records are never sent."
  },
  {
    id: "human-support",
    category: "support",
    categoryLabel: "Support & Contact",
    question: "How do I reach a human support representative?",
    answer: "If AI Support cannot resolve your question, or if you need account or billing verification, you can contact our human support desk anytime at support@queueless.local."
  }
];
