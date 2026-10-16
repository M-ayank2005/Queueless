import mongoose, { Schema, Document } from "mongoose";
import { IService } from "./User";

export interface INotificationLedger {
  turnApproachingSentAt?: Date;
  yourTurnSentAt?: Date;
}

export interface IQueueEntry extends Document {
  businessId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  date: Date; // Normalized to midnight
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  selectedServices: IService[];
  totalEstimatedTime: number; // in minutes
  joinedAt: Date;
  serviceStartedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  actualServiceDurationMin?: number;
  customerName: string; // duplicate for easier display
  notificationLedger?: INotificationLedger;
  shareToken?: string;
  shareTokenCreatedAt?: Date;
  shareTokenRevoked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QueueEntrySchema = new Schema<IQueueEntry>({
  businessId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ["waiting", "in_progress", "completed", "cancelled"], 
    default: "waiting",
    index: true
  },
  selectedServices: [{
    name: { type: String, required: true },
    durationMin: { type: Number, required: true },
    cost: { type: Number, required: true }
  }],
  totalEstimatedTime: { type: Number, required: true },
  joinedAt: { type: Date, default: Date.now, index: true },
  serviceStartedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  actualServiceDurationMin: { type: Number },
  customerName: { type: String, required: true },
  notificationLedger: {
    turnApproachingSentAt: { type: Date },
    yourTurnSentAt: { type: Date }
  },
  shareToken: { type: String, sparse: true, index: true },
  shareTokenCreatedAt: { type: Date },
  shareTokenRevoked: { type: Boolean, default: false }
}, { timestamps: true });

// Compound indexes for production query patterns
QueueEntrySchema.index({ businessId: 1, date: 1, status: 1, joinedAt: 1 });
QueueEntrySchema.index({ customerId: 1, status: 1 });
QueueEntrySchema.index({ customerId: 1, date: -1, joinedAt: -1 });

export default mongoose.model<IQueueEntry>("QueueEntry", QueueEntrySchema);
