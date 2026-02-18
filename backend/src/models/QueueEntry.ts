import mongoose, { Schema, Document } from "mongoose";
import { IService } from "./User";

export interface IQueueEntry extends Document {
  businessId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  date: Date; // Normalized to midnight
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  selectedServices: IService[];
  totalEstimatedTime: number; // in minutes
  joinedAt: Date;
  customerName: string; // duplicate for easier display
}

const QueueEntrySchema = new Schema<IQueueEntry>({
  businessId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ["waiting", "in_progress", "completed", "cancelled"], 
    default: "waiting" 
  },
  selectedServices: [{
    name: String,
    durationMin: Number,
    cost: Number
  }],
  totalEstimatedTime: { type: Number, required: true },
  joinedAt: { type: Date, default: Date.now },
  customerName: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IQueueEntry>("QueueEntry", QueueEntrySchema);
