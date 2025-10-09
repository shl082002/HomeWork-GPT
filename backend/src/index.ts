import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import pdfTextRoutes from "./routes/pdfText.route";
import chatRoutes from "./routes/chat.routes";
import quizRoutes from "./routes/quiz.route";
import userRoutes from "./routes/user.route";
import vectorStoreRoutes from "./routes/vectorStore.route";
import quizResultRoutes from "./routes/quizResult.route";
import { connectDB } from "./db/connect";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Use the PDF text extraction route
app.use("/api/pdf-text", pdfTextRoutes);
app.use("/api/vector-store", vectorStoreRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/user", userRoutes);
app.use("/api/quiz-results", quizResultRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
