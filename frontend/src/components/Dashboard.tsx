import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";
import LoadingOverlay from "./LoadingOverlay";
import Gravition from "../assets/gravitation.pdf";
import Rotation from "../assets/rotation.pdf";
import { MdOutlineUploadFile } from "react-icons/md";
import { useLocation } from "react-router-dom";
import { axiosInstance } from "../api/axiosInstance";
import { RiGeminiFill } from "react-icons/ri";
// Tell pdfjs where worker is
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// -------------------- Types --------------------
type Route = "home" | "upload" | "quiz" | "chat" | "dashboard";

type SeededPdf = { id: string; title: string; url: string };

interface QuizData {
  questions: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
}
interface QuizAttempt {
  _id: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  createdAt: string;
}

interface QuizStats {
  totalAttempts: number;
  avgScore: number;
  avgAccuracy: number;
  recentAttempts: QuizAttempt[];
}

// -------------------- Config --------------------
const API = import.meta.env.VITE_API_URL || "/api";

const seededPdfs: SeededPdf[] = [
  {
    id: "seed-1",
    title: "NCERT Class XI Physics - Gravitation",
    url: Gravition,
  },
  {
    id: "seed-2",
    title: "NCERT Class XI Physics - Rotational Motion",
    url: Rotation,
  },
];

export default function Dashboard() {
  const location = useLocation();
  // Defensive: ensure location.state is an array with at least 2 elements
  let userId: string | undefined = undefined;
  let name: string | undefined = undefined;
  if (Array.isArray(location.state)) {
    [userId, name] = location.state;
  } else if (
    location.state &&
    typeof location.state === "object" &&
    "userId" in location.state &&
    "name" in location.state
  ) {
    // fallback if state is an object with keys
    userId = (location.state as { userId: string; name: string }).userId;
    name = (location.state as { userId: string; name: string }).name;
  }

  const [route, setRoute] = useState<Route>("home");
  const [selectedPdfURL, setSelectedPdfURL] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
  // Quiz state
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  // Quiz Preview state
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number | null>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  // Chat state
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [chatList, setChatList] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [stats, setStats] = useState<QuizStats | null>(null);

  // Responsive PDF preview width
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [pdfRenderWidth, setPdfRenderWidth] = useState<number>(600);

  // Keep track of the last object URL created so we can revoke it
  const lastObjectUrlRef = useRef<string | null>(null);

  // -------------------- Effects --------------------

  // Fetch stats when userId becomes available
  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data } = await axiosInstance.get(`/quiz-results/${userId}`);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch quiz analysis", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Fetch chat list when userId available (initial load + when userId changes)
  useEffect(() => {
    if (!userId) return;
    const fetchChats = async () => {
      try {
        const res = await axiosInstance.get(`/chat/chat-history/${userId}`);
        setChatList(res.data.chats || []);
      } catch (err) {
        console.error("Failed to fetch chats", err);
      }
    };
    fetchChats();
  }, [userId]);

  // scroll chat to bottom when messages change
  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  // Revoke created object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(lastObjectUrlRef.current);
        } catch {
          // ignore
        }
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  // Responsive PDF width: measure container and update on resize
  useEffect(() => {
    const computeWidth = () => {
      const container = pdfContainerRef.current;
      if (!container) return;
      // leave some padding and account for sidebar at smaller widths
      const max = Math.min(900, container.clientWidth - 24);
      setPdfRenderWidth(Math.max(300, max));
    };
    computeWidth();
    window.addEventListener("resize", computeWidth);
    return () => window.removeEventListener("resize", computeWidth);
  }, []);

  // -------------------- PDF Handlers --------------------
  const handleSelectSeeded = (url: string) => {
    // clear any local file
    if (lastObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(lastObjectUrlRef.current);
      } catch {
        //
      }
      lastObjectUrlRef.current = null;
    }
    setSelectedPdfURL(url || null);
    setLocalFile(null);
    setPageNumber(1);
  };

  const handleUpload = (file: File | null) => {
    if (!file) return;
    // revoke previous
    if (lastObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(lastObjectUrlRef.current);
      } catch {
        //
      }
    }
    setLocalFile(file);
    const url = URL.createObjectURL(file);
    lastObjectUrlRef.current = url;
    setSelectedPdfURL(url);
    setPageNumber(1);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // -------------------- PDF -> Extract Text -> Quiz --------------------
  const generateQuizFromPdf = async () => {
    try {
      if (!localFile && !selectedPdfURL) {
        alert("Please upload or select a PDF first.");
        return;
      }

      setLoading(true);
      setLoadingMessage("Generating quiz from PDF...");
      setQuiz(null);
      setSelectedAnswers({});
      setSubmitted(false);
      setScore(null);

      let fileToSend: File | null = localFile;

      // If seeded PDF is selected (not user-uploaded)
      if (!fileToSend && selectedPdfURL) {
        const response = await fetch(selectedPdfURL);
        if (!response.ok) throw new Error("Failed to fetch seeded PDF.");
        const blob = await response.blob();
        fileToSend = new File([blob], "seeded.pdf", {
          type: "application/pdf",
        });
      }

      if (!fileToSend) throw new Error("No PDF available to process.");

      // Upload PDF file to backend
      const fd = new FormData();
      fd.append("file", fileToSend);

      setLoadingMessage("Extracting text from PDF...");
      const res = await axiosInstance.post(`/pdf-text`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const text = res.data?.text as string;
      if (!text) throw new Error("No text extracted from PDF");

      setLoadingMessage("Generating quiz using AI...");
      const qres = await axiosInstance.post(`/quiz`, { text });

      // The updated QuizData interface expects an object with a "questions" array,
      // where each question has question, options, answerIndex, and explanation.

      // Parse the quiz data from the backend
      const quizData =
        typeof qres.data.quiz === "string"
          ? JSON.parse(qres.data.quiz)
          : qres.data.quiz;

      const questions =
        Array.isArray(quizData?.questions) && quizData.questions.length > 0
          ? quizData.questions.map(
              (q: {
                question: string;
                options: string[];
                answerIndex: number;
                explanation: string;
              }) => ({
                question: q.question,
                options: q.options,
                answerIndex: q.answerIndex,
                explanation: q.explanation,
              })
            )
          : [];

      setQuiz({ questions });
      setRoute("quiz");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "unknown";
      alert("Quiz generation failed: " + errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage(undefined);
    }
  };

  // Quiz Preview handlers
  const handleSelect = (qIndex: number, optionIndex: number) => {
    if (submitted) return; // prevent change after submission
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz || Object.keys(selectedAnswers).length < quiz.questions.length) {
      alert("Please answer all questions before submitting!");
      return;
    }

    let correct = 0;
    const answers = quiz.questions.map((q, i) => {
      const selected = selectedAnswers[i];
      const isCorrect = selected === q.answerIndex;
      if (isCorrect) correct++;
      return {
        question: q.question,
        selectedIndex: selected,
        correctIndex: q.answerIndex,
        isCorrect,
      };
    });

    setScore(correct);
    setSubmitted(true);

    try {
      if (!userId) {
        // still allow local scoring but don't attempt save when userId missing
        console.warn("userId missing; skipping saving quiz results");
        return;
      }
      await axiosInstance.post(`/quiz-results`, {
        userId,
        score: correct,
        totalQuestions: quiz.questions.length,
        answers,
      });
      // refresh stats after submit
      const { data } = await axiosInstance.get(`/quiz-results/${userId}`);
      setStats(data);
    } catch (err) {
      console.error("Failed to save quiz:", err);
    }
  };

  // -------------------- Chat (RAG) --------------------
  const ingestPdfToVectorStore = async () => {
    try {
      if (!API) throw new Error("API base URL is missing.");
      if (!localFile && !selectedPdfURL) {
        alert("Select or upload a PDF before ingestion.");
        return;
      }
      setLoading(true);
      setLoadingMessage("Preparing to ingest PDF into vector store...");

      let fileToSend: File | null = localFile;

      // Handle seeded (remote) PDF as file
      if (!fileToSend && selectedPdfURL) {
        setLoadingMessage("Fetching seeded PDF...");
        const response = await fetch(selectedPdfURL);
        if (!response.ok) throw new Error("Failed to fetch seeded PDF file.");
        const blob = await response.blob();
        fileToSend = new File([blob], "seeded.pdf", {
          type: "application/pdf",
        });
      }

      if (!fileToSend) throw new Error("No PDF file found.");

      // Step 1: Extract text from PDF via backend
      setLoadingMessage("Extracting text from PDF...");
      const fd = new FormData();
      fd.append("file", fileToSend);

      const { data: pdfData } = await axiosInstance.post(`/pdf-text`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const text = pdfData?.text?.trim();
      if (!text || text.length < 100)
        throw new Error("No meaningful text extracted from PDF.");

      // Step 2: Send text to backend for embedding + vector storage
      setLoadingMessage("Embedding and storing vectors in database...");
      await axiosInstance.post(`/vector-store`, { text, userId });

      setLoadingMessage(undefined);
      alert(
        "✅ PDF successfully ingested into vector store. You can now chat with it!"
      );
      setRoute("chat");
    } catch (err: unknown) {
      console.error("Ingestion failed:", err);
      const errorMessage = err instanceof Error ? err.message : "unknown";
      alert("❌ Ingestion failed: " + errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage(undefined);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    if (!currentChatId) {
      alert("Please create or open a chat first.");
      return;
    }
    setChatLoading(true);
    const userMsg = chatInput.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setChatInput("");

    try {
      const res = await axiosInstance.post(`/chat`, {
        question: userMsg,
        userId,
        chatId: currentChatId,
      });
      const bot = res.data.answer || res.data.reply || "(no response)";
      setMessages((m) => [...m, { role: "assistant", content: bot }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Failed to get response" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const createNewChat = async () => {
    if (!userId) {
      alert("User not identified. Cannot create a chat.");
      return;
    }
    try {
      const res = await axiosInstance.post(`/chat/chat-create`, {
        userId,
        title: `Chat ${new Date().toLocaleString()}`,
      });
      setCurrentChatId(res.data.chat._id);
      setMessages([]);
      // refresh chat list
      const listRes = await axiosInstance.get(`/chat/chat-history/${userId}`);
      setChatList(listRes.data.chats || []);
    } catch (err) {
      console.error("Failed to create chat", err);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const res = await axiosInstance.get(`/chat/chat-messages/${chatId}`);
      setMessages(res.data.messages || []);
      setCurrentChatId(chatId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r p-4 flex flex-col hidden md:flex">
        <div className="mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-x-2">
            HomeWork GPT
            <RiGeminiFill />
          </h2>
          <p className="text-sm text-slate-500">PDF | Quiz | Chat | Stats</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setRoute("home")}
            className={`w-full text-left p-2 rounded ${
              route === "home" ? "bg-indigo-50" : "hover:bg-slate-100"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setRoute("upload")}
            className={`w-full text-left p-2 rounded ${
              route === "upload" ? "bg-indigo-50" : "hover:bg-slate-100"
            }`}
          >
            Upload / Preview
          </button>
          <button
            onClick={() => setRoute("quiz")}
            className={`w-full text-left p-2 rounded ${
              route === "quiz" ? "bg-indigo-50" : "hover:bg-slate-100"
            }`}
          >
            Quiz
          </button>
          <button
            onClick={() => setRoute("chat")}
            className={`w-full text-left p-2 rounded ${
              route === "chat" ? "bg-indigo-50" : "hover:bg-slate-100"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setRoute("dashboard")}
            className={`w-full text-left p-2 rounded ${
              route === "dashboard" ? "bg-indigo-50" : "hover:bg-slate-100"
            }`}
          >
            Dashboard
          </button>
        </nav>

        <div className="mt-4">
          <p className="text-xs text-slate-500">Seeded PDFs</p>
          <div className="mt-2 space-y-2">
            {seededPdfs.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSeeded(s.url)}
                className={`w-full text-left p-2 rounded hover:bg-slate-100 text-sm ${
                  selectedPdfURL === s.url
                    ? "bg-green-100 border-green-400"
                    : ""
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-400">Backend: {API}</div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-6 h-[100vh] overflow-y-scroll">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold capitalize">{route}</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">Hi, {name ?? "Guest"}</div>
            {/* small-screen nav toggle */}
            <div className="md:hidden">
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value as Route)}
                className="border rounded p-1 text-sm"
              >
                <option value="home">Home</option>
                <option value="upload">Upload / Preview</option>
                <option value="quiz">Quiz</option>
                <option value="chat">Chat</option>
                <option value="dashboard">Dashboard</option>
              </select>
            </div>
          </div>
        </header>

        <section>
          {route === "home" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2 bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Quick Actions</h3>
                <div className="flex flex-col md:flex-row gap-2">
                  <label className="flex-1">
                    <div className="text-xs text-slate-500">Upload PDF</div>
                    <div className="flex items-center gap-x-2">
                      <MdOutlineUploadFile />
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) =>
                          handleUpload(e.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                  </label>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <button
                      onClick={generateQuizFromPdf}
                      disabled={!selectedPdfURL && !localFile}
                      className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
                    >
                      Generate Quiz
                    </button>
                    <button
                      onClick={ingestPdfToVectorStore}
                      disabled={!selectedPdfURL && !localFile}
                      className="px-4 py-2 border rounded disabled:opacity-60"
                    >
                      Ingest for Chat
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-500">
                  Selected PDF:{" "}
                  {selectedPdfURL
                    ? selectedPdfURL.split("/").slice(-1)[0]
                    : "None"}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Progress</h3>
                <div className="space-y-2 text-sm">
                  <div>Total attempts: {stats?.totalAttempts ?? 0}</div>
                  <div>Average score: {stats?.avgScore ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          {route === "upload" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Upload / Select</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-x-2">
                    <MdOutlineUploadFile />
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        handleUpload(e.target.files?.[0] ?? null)
                      }
                    />
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Or select seeded PDF
                  </div>
                  {seededPdfs.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSeeded(s.url)}
                      className={`block w-full text-left p-2 border rounded mt-2 ${
                        selectedPdfURL === s.url
                          ? "bg-green-100 border-green-400"
                          : ""
                      }`}
                    >
                      {s.title}
                    </button>
                  ))}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => generateQuizFromPdf()}
                      disabled={!localFile && !selectedPdfURL}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
                    >
                      Generate Quiz
                    </button>
                    <button
                      onClick={() => ingestPdfToVectorStore()}
                      disabled={!localFile && !selectedPdfURL}
                      className="flex-1 px-3 py-2 border rounded disabled:opacity-60"
                    >
                      Ingest
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">PDF Preview</h3>
                <div
                  className="border rounded h-[70vh] overflow-auto flex justify-center items-start p-4"
                  ref={pdfContainerRef}
                >
                  {selectedPdfURL ? (
                    <Document
                      file={selectedPdfURL}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(e) => console.error("PDF load error", e)}
                    >
                      <Page pageNumber={pageNumber} width={pdfRenderWidth} />
                    </Document>
                  ) : (
                    <div className="text-slate-500 p-6">No PDF selected</div>
                  )}
                </div>

                {numPages && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div>
                      Page {pageNumber} / {numPages}
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 border rounded"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() =>
                          setPageNumber((p) => Math.min(numPages, p + 1))
                        }
                        className="px-3 py-1 border rounded"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {route === "quiz" && quiz && (
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              <h1 className="text-3xl font-bold text-center mb-6">🧩 Quiz</h1>

              {quiz.questions.map((q, i) => {
                const selected = selectedAnswers[i];
                const correctIndex = q.answerIndex;
                const isCorrect = submitted && selected === correctIndex;

                return (
                  <div
                    key={i}
                    className="p-5 bg-white shadow-md rounded-2xl border border-gray-200"
                  >
                    <p className="font-semibold mb-3">
                      Q{i + 1}. {q.question}
                    </p>

                    <ul className="space-y-2">
                      {q.options.map((opt, idx) => {
                        const isSelected = selected === idx;
                        return (
                          <li
                            key={idx}
                            onClick={() => handleSelect(i, idx)}
                            className={`p-2 border rounded-md cursor-pointer transition ${
                              submitted
                                ? idx === correctIndex
                                  ? "bg-green-100 border-green-400"
                                  : isSelected
                                  ? "bg-red-100 border-red-400"
                                  : "border-gray-300"
                                : isSelected
                                ? "bg-blue-100 border-blue-400"
                                : "border-gray-300 hover:bg-gray-100"
                            }`}
                          >
                            {opt}
                          </li>
                        );
                      })}
                    </ul>

                    {submitted && (
                      <p
                        className={`mt-3 text-sm ${
                          isCorrect ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {isCorrect
                          ? "✅ Correct!"
                          : `❌ Wrong. Correct answer: ${q.options[correctIndex]}`}
                      </p>
                    )}

                    {submitted && q.explanation && (
                      <p className="mt-2 text-gray-600 italic">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Score + Actions */}
              <div className="text-center mt-6">
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                      🎯 Your Score: {score} / {quiz.questions.length}
                    </h2>
                    <button
                      onClick={generateQuizFromPdf}
                      className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                      Re-Generate
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {route === "chat" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left Sidebar: Chat History */}
              <aside className="bg-white p-4 rounded-lg shadow-sm lg:col-span-1">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Chat History</h4>
                  <button
                    onClick={createNewChat}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
                  >
                    + New
                  </button>
                </div>
                <ul className="space-y-1 text-sm">
                  {chatList.map((chat) => (
                    <li
                      key={chat._id}
                      onClick={() => loadChatMessages(chat._id)}
                      className={`p-2 rounded cursor-pointer ${
                        currentChatId === chat._id
                          ? "bg-indigo-100 font-medium"
                          : "hover:bg-slate-100"
                      }`}
                    >
                      {chat.title}
                    </li>
                  ))}
                </ul>
              </aside>

              {/* Main Chat */}
              <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-3 flex flex-col">
                <div
                  ref={messagesRef}
                  className="flex-1 overflow-auto border rounded p-2"
                  style={{ maxHeight: "65vh" }}
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-2 my-1 rounded ${
                        m.role === "user"
                          ? "bg-indigo-50 text-right"
                          : "bg-slate-100 text-left"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {/* Loader bubble */}
                  {chatLoading && (
                    <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-xl w-fit">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300" />
                    </div>
                  )}
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about the selected PDF..."
                    className="flex-1 border rounded p-2"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!currentChatId}
                    className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {route === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Attempts</h3>
                <ul className="space-y-2 text-sm">
                  {stats?.recentAttempts?.map((item, idx) => {
                    return (
                      <div key={idx} className="bg-blue-100 p-4 rounded-sm">
                        <p>Score: {item?.score}</p>
                        <p>Accuracy: {item?.accuracy}</p>
                        <p>Submitted at: {item?.createdAt}</p>
                      </div>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="text-sm">
                  Total Attempts: {stats?.totalAttempts ?? 0}
                </div>
                <div className="text-sm">
                  Average Score: {stats?.avgScore ?? 0}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Global Loading */}
      {loading && <LoadingOverlay message={loadingMessage} />}
    </div>
  );
}
