import express from "express";
import multer from "multer";
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
const pdfParse = require("pdf-parse");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  try {
    const data = await pdfParse(req.file.buffer);

    return res.status(200).json({ text: data.text });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to parse PDF");
  }
});

export default router;
