import mongoose, { Schema, Document } from "mongoose";

export interface IService {
  name: string;
  durationMin: number;
  cost: number;
}

export interface IBusinessProfile {
  shopName: string;
  address: string;
  uniqueQrCode: string;
  services: IService[];
  workingHours: {
      openTime: string;
      closeTime: string;
      closedDays: number[];
  };
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "customer" | "business";
  businessProfile?: IBusinessProfile;
}

const ServiceSchema = new Schema<IService>({
  name: { type: String, required: true },
  durationMin: { type: Number, required: true },
  cost: { type: Number, required: true },
});

const BusinessProfileSchema = new Schema<IBusinessProfile>({
  shopName: { type: String },
  address: { type: String },
  uniqueQrCode: { type: String, unique: true, sparse: true },
  services: [ServiceSchema],
  workingHours: {
      openTime: { type: String, default: "09:00" }, // 24h format HH:mm
      closeTime: { type: String, default: "17:00" },
      closedDays: { type: [Number], default: [] } // 0=Sunday, 1=Monday...
  }
});

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer", "business"], required: true },
  businessProfile: { type: BusinessProfileSchema },
}, { timestamps: true });

export default mongoose.model<IUser>("User", UserSchema);
