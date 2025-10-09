import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//Generate New Quiz
router.post("/", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    // Tell model to respond strictly in JSON
    const prompt = `
Generate a quiz from the following content.
Create only MCQ (Multiple Choice Questions) type questions.
Generate exactly 10 MCQ questions.
Each question should be an object with "question", "options", "answerIndex", and "explanation".
Return ONLY valid JSON. Do not include markdown fences or any extra commentary.

Content:
${text}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // forces JSON structure
    });

    const result = completion.choices[0].message.content;
    const quiz = JSON.parse(result || "{}");

    res.json({ quiz });
  } catch (err: any) {
    console.error("Quiz generation error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});
export default router;
