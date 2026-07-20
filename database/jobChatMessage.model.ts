import { Document, Schema, model, models } from "mongoose";

export interface IJobChatMessage extends Document {
  sessionId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const JobChatMessageSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeSession",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

JobChatMessageSchema.index({ sessionId: 1, createdAt: -1 });

const JobChatMessage =
  models.JobChatMessage ||
  model<IJobChatMessage>("JobChatMessage", JobChatMessageSchema);

export default JobChatMessage;
