import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
import { getEmbedding } from "../utils/embeddings";
import { ChatModel } from "../db/models/chat.model";
import { EmbeddingModel } from "../db/models/embedding.model";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Safe cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

//Add Message to Chat
router.post("/", async (req, res) => {
  try {
    const { question, userId, chatId } = req.body;
    if (!question || !userId || !chatId)
      return res
        .status(400)
        .json({ error: "Missing question or userId or ChatId" });

    // Create query embedding
    const queryEmbedding = await getEmbedding(question);

    // Retrieve stored embeddings for this user
    const embeddings = await EmbeddingModel.find({ userId });

    if (!embeddings?.length)
      return res
        .status(404)
        .json({ error: "No embeddings found for this user" });

    // Compute similarity scores
    const scored = embeddings
      .map((v: any) => {
        const emb = Array.isArray(v.embedding)
          ? v.embedding
          : Object.values(v.embedding || {}); // flatten if object
        return {
          text: v.text,
          source: v.source,
          score: cosineSimilarity(queryEmbedding, emb),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Join context safely
    const context = scored
      .map((v) => v.text)
      .join("\n\n")
      .slice(0, 6000); // prevent prompt overflow

    // Fetch or create chat
    let chat = chatId ? await ChatModel.findById(chatId) : null;
    if (!chat) {
      return res.status(404).json({
        message: "Chat is not found",
      });
    }

    const messages = [
      {
        role: "system" as const,
        content: "You are a helpful teaching assistant chatbot.",
      },
      ...(chat?.messages ?? []).map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: `Answer based only on the context below. If unsure, say you don't know.\n\nContext:\n${context}\n\nQuestion:\n${question}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() || "No answer generated.";

    // Store conversation
    chat.messages.push({ role: "user", content: question });
    chat.messages.push({ role: "assistant", content: answer });
    await chat.save();

    res.json({
      success: true,
      answer,
      sources: scored.map((s) => s.source),
      chatId: chat._id,
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// Create a new chat
router.post("/chat-create", async (req, res) => {
  const { userId, title } = req.body;
  const chat = new ChatModel({ userId, title });
  await chat.save();
  res.json({ chat });
});

// Get all chats for user
router.get("/chat-history/:userId", async (req, res) => {
  const { userId } = req.params;
  const chats = await ChatModel.find({ userId }).sort({ createdAt: -1 });
  res.json({ chats });
});

// Get messages of a chat
router.get("/chat-messages/:chatId", async (req, res) => {
  const chat = await ChatModel.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Chat not found" });
  res.json({ messages: chat.messages });
});

export default router;
