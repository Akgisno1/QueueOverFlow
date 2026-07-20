import { Document, Schema, model, models } from "mongoose";

export interface IResumeChunk extends Document {
  sessionId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const ResumeChunkSchema = new Schema(
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
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

ResumeChunkSchema.index({ sessionId: 1, chunkIndex: 1 });

const ResumeChunk =
  models.ResumeChunk || model<IResumeChunk>("ResumeChunk", ResumeChunkSchema);

export default ResumeChunk;
