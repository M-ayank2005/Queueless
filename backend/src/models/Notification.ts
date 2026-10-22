import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
  | "joined"
  | "queue_updated"
  | "turn_near"
  | "your_turn"
  | "checked_in"
  | "completed"
  | "cancelled";

export interface INotificationMeta {
  position?: number;
  waitMin?: number;
  shopName?: string;
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  queueId?: mongoose.Types.ObjectId;
  businessId?: mongoose.Types.ObjectId;
  meta?: INotificationMeta;
  readAt?: Date | null;
  dedupeKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "joined",
        "queue_updated",
        "turn_near",
        "your_turn",
        "checked_in",
        "completed",
        "cancelled",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    queueId: { type: Schema.Types.ObjectId, ref: "QueueEntry" },
    businessId: { type: Schema.Types.ObjectId, ref: "User" },
    meta: {
      position: { type: Number },
      waitMin: { type: Number },
      shopName: { type: String },
    },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }); // 30-day TTL

export default mongoose.model<INotification>("Notification", NotificationSchema, "notifications");
