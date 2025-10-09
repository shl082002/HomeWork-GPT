# HomeWork-GPT by Sahil Verma

## Technology Stack

- **Frontend:** React with TailwindCSS for modern, responsive UI
- **Backend:** Node.js (Express) for REST APIs, with additional FASTAPI endpoints
- **Database:** MongoDB for robust data storage
- **AI & NLP:** Langchain for language processing, Huggingface for advanced embeddings

## Getting Started

1. **Clone the repository**
2. **Backend Setup:**
   - Navigate to the `backend` directory
   - Install dependencies: `npm install`
   - Start the server: `npm run dev`
3. **Frontend Setup:**
   - Navigate to the `frontend` directory
   - Install dependencies: `npm install`
   - Launch the development server: `npm run dev`
4. **Embedding Service:**
   - Navigate to the `services` directory
   - Run `python embedding.py` to start the embedding service
5. **Create a new user account** to begin exploring the app

## Key Features

- **Quiz Generation from PDFs:** Instantly create quizzes from uploaded PDF documents (note: OpenAI free tier has word limits)
- **Quiz Regeneration:** Easily generate new quizzes for the same document
- **Attempt Tracking:** Save your quiz attempts and view detailed scoring
- **PDF-Powered Chat:** Ingest PDFs to enable context-aware chat interactions
- **Enhanced Chat Quality:** Leverage vector embeddings for more accurate and relevant chat responses
- **User Authentication:** Secure signup and login functionality
- **Chat History:** Access and review your previous chat sessions

## Improvements & Tradeoffs

- The current implementation uses free-tier services, which impose certain limitations on speed and accuracy. Integrating more advanced or paid tools can significantly enhance performance and reliability.
