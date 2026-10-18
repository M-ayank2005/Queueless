export interface FaqItem {
  id: string;
  category: "queues" | "verification" | "editing" | "business" | "privacy" | "support";
  categoryLabel: string;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "queues", label: "Queues" },
  { id: "verification", label: "Verification" },
  { id: "editing", label: "Quantities" },
  { id: "business", label: "Store" },
  { id: "privacy", label: "Privacy" },
  { id: "support", label: "Contact" }
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "join-queue",
    category: "queues",
    categoryLabel: "Queues",
    question: "How do I join a queue?",
    answer: "Scan the store's unique QR code using the 'Scan & Join' tab or enter the store code manually. Select your desired services, choose quantities, and tap 'Join Queue'."
  },
  {
    id: "track-status",
    category: "queues",
    categoryLabel: "Queues",
    question: "How do I check my position in line?",
    answer: "Your active ticket screen shows your exact place in line, how many people are ahead of you, and real-time estimated waiting time based on current counter speed."
  },
  {
    id: "leave-queue",
    category: "queues",
    categoryLabel: "Queues",
    question: "Can I cancel my ticket?",
    answer: "Yes. Tap 'Cancel Ticket' from your ticket status screen to leave the line voluntarily. This frees up your spot for other waiting customers."
  },
  {
    id: "verification-qr",
    category: "verification",
    categoryLabel: "Verification",
    question: "What is Counter Verification?",
    answer: "When your turn is called at the counter, show your Counter Verification QR code or your 6-character Ticket ID to the counter staff to verify that the spot is yours."
  },
  {
    id: "counter-privacy",
    category: "verification",
    categoryLabel: "Verification",
    question: "Does the verification QR leak my data?",
    answer: "No. The QR code contains an opaque, cryptographically secure verification token (no passwords or personal contact info) to protect your privacy."
  },
  {
    id: "service-quantities",
    category: "editing",
    categoryLabel: "Quantities",
    question: "Can I request more than 1 service item?",
    answer: "Yes! Use the [-] and [+] steppers when joining a queue to select multiple quantities (e.g., 3 haircuts for family). Wait estimates automatically scale."
  },
  {
    id: "edit-services",
    category: "editing",
    categoryLabel: "Quantities",
    question: "Can I edit my services without losing my spot?",
    answer: "Yes! Tap 'Edit Requested Services' on your active ticket screen to change services or counts in-place while keeping your exact place in line."
  },
  {
    id: "business-mgmt",
    category: "business",
    categoryLabel: "Store",
    question: "How do businesses manage queues?",
    answer: "Merchants can view active and waiting tickets on their dashboard, call or SMS customers directly, advance statuses, and verify customer tickets at the counter."
  },
  {
    id: "payments-refunds",
    category: "business",
    categoryLabel: "Store",
    question: "Are payments handled in the app?",
    answer: "No. QueueLess manages queue reservations only. All service payments and refund policies are handled in person directly with the merchant."
  },
  {
    id: "ai-privacy",
    category: "privacy",
    categoryLabel: "Privacy",
    question: "How does AI Support work?",
    answer: "QueueLess AI Support connects to Google Gemini using only your authenticated active ticket details. Passwords, hashes, and other users' records are never sent."
  },
  {
    id: "human-support",
    category: "support",
    categoryLabel: "Contact",
    question: "How do I contact human support?",
    answer: "If you need personal assistance with your account, you can email our support desk at support@queueless.local."
  }
];
