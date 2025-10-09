import express from "express";
import { chunkText } from "../utils/chunker";
import { getEmbedding } from "../utils/embeddings";
import { EmbeddingModel } from "../../src/db/models/embedding.model";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { text, source, userId } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    const chunks = chunkText(text);
    const records = [];

    for (let i = 0; i < chunks.length; i++) {
      const emb = await getEmbedding(chunks[i]);
      records.push({
        chunkId: `${Date.now()}_${i}`,
        text: chunks[i],
        embedding: emb,
        source,
        userId,
      });
    }

    await EmbeddingModel.insertMany(records);
    return res.json({ added: records.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to store embeddings" });
  }
});

export default router;
