import { Document, Schema, model, models } from "mongoose";

export interface IResumeSession extends Document {
  userId: Schema.Types.ObjectId;
  clerkId: string;
  resumeText: string;
  status: "active" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clerkId: { type: String, required: true, index: true },
    resumeText: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

ResumeSessionSchema.index({ userId: 1, status: 1 });

const ResumeSession =
  models.ResumeSession ||
  model<IResumeSession>("ResumeSession", ResumeSessionSchema);

export default ResumeSession;
