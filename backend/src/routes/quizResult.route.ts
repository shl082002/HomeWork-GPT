import express from "express";
import { QuizResult } from "../db/models/quizRes.model";

const router = express.Router();

// 🧾 Save quiz result
router.post("/", async (req, res) => {
  try {
    const { userId, score, totalQuestions, answers } = req.body;
    if (!userId || !score || !totalQuestions)
      return res.status(400).json({ error: "Missing fields" });

    const accuracy = (score / totalQuestions) * 100;

    const result = await QuizResult.create({
      userId,
      score,
      totalQuestions,
      accuracy,
      answers,
    });

    res.json({ message: "Quiz saved", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save quiz result" });
  }
});

// 📊 Get analytics for user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await QuizResult.find({ userId }).sort({ createdAt: -1 });

    const totalAttempts = results.length;
    const avgScore =
      totalAttempts > 0
        ? results.reduce((acc, r) => acc + r.score, 0) / totalAttempts
        : 0;

    const avgAccuracy =
      totalAttempts > 0
        ? results.reduce((acc, r) => acc + r.accuracy, 0) / totalAttempts
        : 0;

    res.json({
      totalAttempts,
      avgScore,
      avgAccuracy,
      recentAttempts: results.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
