import mongoose, { Schema, Document } from "mongoose";

interface IAnswer {
  question: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
}

export interface IQuizResult extends Document {
  userId: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  answers: IAnswer[];
  createdAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  question: { type: String, required: true },
  selectedIndex: { type: Number, required: true },
  correctIndex: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
});

const QuizResultSchema = new Schema<IQuizResult>(
  {
    userId: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    answers: [AnswerSchema],
  },
  { timestamps: true }
);

export const QuizResult = mongoose.model<IQuizResult>(
  "QuizResult",
  QuizResultSchema
);
