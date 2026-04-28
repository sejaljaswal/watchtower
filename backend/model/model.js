import mongoose from "mongoose";

const websiteStatusEnum = ["Good", "Bad"];

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  userId: { type: String, required: true, unique: true },
  pushoverUserKey: { type: String },
});

const websiteSchema = new mongoose.Schema({
  url: { type: String, required: true },
  websiteName: { type: String, required: true },
  userId: { type: String, required: true, ref: "User" },
  createdAt: { type: Date, required: true, default: Date.now },
  disabled: { type: Boolean, default: false },
  lastEmailSent: Date
});

const validatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  publicKey: { type: String, required: true },
  location: { type: String, required: true },
  ip: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  pendingPayouts: { type: Number, default: 0 },
  payoutPublicKey: { type: String, required: true },
  password: { type: String, required: true },
  // Reputation System Fields
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  totalChecks: { type: Number, default: 0 },
  successfulVerifications: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  // Blockchain & Trial Fields
  isAdmitted: { type: Boolean, default: false },
  trialStartedAt: { type: Date, default: Date.now },
  onChainProfilePDA: { type: String, default: null },
});

const websiteTickSchema = new mongoose.Schema({
  websiteId: { type: String, required: true, ref: "Website" },
  validatorId: { type: String, required: true, ref: "Validator" },
  createdAt: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: websiteStatusEnum, required: true },
  latency: { type: Number, required: true },
});

const downLogSchema = new mongoose.Schema({
  websiteId: { type: String, required: true, ref: "Website" },
  createdAt: { type: Date, required: true, default: Date.now },
  location: { type: String, required: true },
});

const eventLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  category: { type: String, enum: ['VALIDATOR', 'USER', 'WEBSITE', 'PAYOUT', 'SYSTEM'], required: true, index: true },
  eventType: { type: String, required: true },
  severity: { type: String, enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL', 'AUDIT'], default: 'INFO' },
  actorId: { type: String, index: true }, // ID of the Validator or User
  targetId: { type: String, index: true }, // ID of the Website or Payout
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Flexible JSON payload
});

const User = mongoose.model("User", userSchema);
const Website = mongoose.model("Website", websiteSchema);
const Validator = mongoose.model("Validator", validatorSchema);
const WebsiteTick = mongoose.model("WebsiteTick", websiteTickSchema);
const DownLog = mongoose.model("DownLog", downLogSchema);
const EventLog = mongoose.model("EventLog", eventLogSchema);

export { User, Website, Validator, WebsiteTick, DownLog, EventLog };
