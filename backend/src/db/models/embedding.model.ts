import mongoose from "mongoose";

const embeddingSchema = new mongoose.Schema({
  chunkId: String,
  text: String,
  embedding: [Number],
  source: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

export const EmbeddingModel = mongoose.model("Embedding", embeddingSchema);
