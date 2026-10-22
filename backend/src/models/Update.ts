import mongoose, { Schema, Document } from "mongoose";

export type UpdateType = "alert" | "offer" | "info";

export interface IUpdate extends Document {
  businessId: mongoose.Types.ObjectId;
  type: UpdateType;
  title: string;
  message: string;
  validTill?: Date;
  createdAt: Date;
  expiresAt: Date;
}

const UpdateSchema = new Schema<IUpdate>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["alert", "offer", "info"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    validTill: {
      type: Date,
      required: function (this: IUpdate) {
        return this.type === "offer";
      },
    },
    expiresAt: {
      type: Date,
      required: true,
      default: function (this: IUpdate) {
        if (this.type === "offer" && this.validTill) {
          const d = new Date(this.validTill);
          d.setHours(23, 59, 59, 999);
          return d;
        }
        const now = this.createdAt ? new Date(this.createdAt) : new Date();
        return new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Indexes
UpdateSchema.index({ businessId: 1, createdAt: -1 });
UpdateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default mongoose.model<IUpdate>("Update", UpdateSchema, "updates");
