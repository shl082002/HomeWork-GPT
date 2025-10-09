import axios from "axios";

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await axios.post("http://localhost:5001/embed", { text });
    return res.data.embedding;
  } catch (err: any) {
    console.error("Embedding service error:", err.message);
    throw new Error("Failed to get embedding");
  }
}
