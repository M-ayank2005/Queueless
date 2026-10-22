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
      timezone?: string;
  };
}

export const CURRENT_TERMS_VERSION = "v1.0.0";
export const CURRENT_PRIVACY_POLICY_VERSION = "v1.0.0";
export const CURRENT_LEGAL_VERSIONS = {
  termsVersion: CURRENT_TERMS_VERSION,
  privacyPolicyVersion: CURRENT_PRIVACY_POLICY_VERSION
};

export interface ILegalConsent {
  agreedToTerms: boolean;
  privacyPolicyAcknowledged: boolean;
  acceptedAt: Date;
  termsVersion: string;
  privacyPolicyVersion: string;
  latestAcceptedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface IPushToken {
  token: string;
  platform: 'ios' | 'android';
  updatedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "customer" | "business";
  businessProfile?: IBusinessProfile;
  favoriteBusinesses?: mongoose.Types.ObjectId[];
  legalConsent?: ILegalConsent;
  pushTokens?: IPushToken[];
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
      openTime: { type: String, default: "00:00" }, // 24h format HH:mm
      closeTime: { type: String, default: "23:59" },
      closedDays: { type: [Number], default: [] }, // 0=Sunday, 1=Monday...
      timezone: { type: String, default: "UTC" }
  }
});

const PushTokenSchema = new Schema<IPushToken>({
  token: { type: String, required: true },
  platform: { type: String, enum: ['ios', 'android'], required: true },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const LegalConsentSchema = new Schema<ILegalConsent>({
  agreedToTerms: { type: Boolean, required: true, default: false },
  privacyPolicyAcknowledged: { type: Boolean, required: true, default: false },
  acceptedAt: { type: Date, required: true },
  termsVersion: { type: String, required: true },
  privacyPolicyVersion: { type: String, required: true },
  latestAcceptedAt: { type: Date },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer", "business"], required: true },
  businessProfile: { type: BusinessProfileSchema },
  favoriteBusinesses: [{ type: Schema.Types.ObjectId, ref: "User" }],
  legalConsent: { type: LegalConsentSchema, required: false },
  pushTokens: { type: [PushTokenSchema], default: [] }
}, { timestamps: true });

export default mongoose.model<IUser>("User", UserSchema);

