# DocuMind - Intelligent Document Chat

> **Built by: kk**  


---

DocuMind is an advanced RAG (Retrieval-Augmented Generation) application that allows users to seamlessly interact with their documents using AI. By leveraging the power of Google's Gemini models, Groq's high-speed inference, and vector search, DocuMind provides accurate, context-aware answers from your uploaded files and databases.

## Live Demo

- **Frontend Application:** [https://querywise.vercel.app](https://documind-mrag.vercel.app)
- **Backend API:** [https://documind-p046.onrender.com](https://documind-p046.onrender.com)

## Modular RAG Architecture

DocuMind is built upon a highly scalable Modular RAG framework, ensuring precise context retrieval and coherent responses. The system comprises **6 Main Components**:

1.  **Orchestrator (RAG Service):** Coordinates the entire workflow, managing the flow of data between user input, retrieval, and generation.
2.  **Document Ingestion Engine:** Handles the parsing, cleaning, and segmentation of various file formats (PDF, DOCX, TXT).
3.  **Embedding Service:** Transforms text chunks into high-dimensional vector embeddings for semantic understanding.
4.  **Vector Store (Pinecone):** Manages high-performance similarity search and retrieval of context.
5.  **Parent-Child Indexing Service:** Implements advanced indexing strategies to maximize retrieval quality.
6.  **Generation Service (Gemini/Groq):** Leverages state-of-the-art LLMs to synthesize answers using the retrieved context.

### Vector Storing Methods: Parent & Child Indexing

To overcome the limitations of standard chunking, DocuMind employs a **Parent-Child Indexing** strategy:

-   **Child Chunks:** Small, dense text segments (~300 chars) responsible for high-accuracy semantic search.
-   **Parent Documents:** Larger context blocks linked to the child chunks.
-   **Retrieval Logic:** When a child chunk matches a user's query, the system retrieves its corresponding **Parent Document**. This ensures the LLM receives full, coherent context rather than fragmented snippets.

## Key Features

### 🧠 Advanced RAG Engine
-   **Chat with Documents:** Upload PDFs, DOCX, or text files and ask questions in natural language.
-   **Transparent AI:** View **Vector Scores (V)** and **Resonance Scores (R)** to understand exactly why a document was retrieved.
-   **Strict Scoring:** Uses a local Reranker (`ms-marco-MiniLM-L-12-v2`) to prioritize accuracy over recall.
-   **HyDE:** Uses Hypothetical Document Embeddings to improve search relevance.

### 📊 Database Intelligence & Visualization
-   **Text-to-SQL:** Connect your database and ask questions in plain English (e.g., "Show me total sales by region").
-   **Auto-Visualization:** The system automatically detects data patterns and generates **Bar**, **Line**, or **Pie** charts instantly.
-   **Schema Awareness:** Automatically extracts and understands your database structure for accurate queries.
-   **SQL Safety:** Built-in validator prevents destructive queries and ensures syntax correctness.

### ⚡ Performance & Security
-   **Multi-Model Support:** Switch between **Google Gemini 2.5** for reasoning and **Groq (Llama 3)** for ultra-fast responses.
-   **Secure Authentication:** Robust user management with unique user IDs and secure session handling.
-   **Smart History:** Persistent chat sessions allowing you to revisit previous conversations.
-   **Mobile Responsive:** A modern, mobile-friendly interface built with React and Tailwind CSS.

## Technology Stack

-   **Frontend:** React, Vite, Tailwind CSS, Recharts
-   **Backend:** Python, FastAPI
-   **AI/LLM:** Google Gemini, Groq
-   **Vector DB:** Pinecone
-   **Database:** MongoDB Atlas (Chat History), PostgreSQL/MySQL (Data Analysis)
-   **Deployment:** Vercel (Frontend), Render (Backend)
---

## ⚠️ Project Protection Notice

This project is **protected and authenticated** with embedded signature verification. The signature system ensures proper attribution and project integrity.

**Key Protection Features:**
- 🔒 **Signature Verification:** Both backend and frontend verify the project signature on startup
- 🛡️ **Tamper Protection:** Removing or modifying the signature will prevent the application from running
- 👤 **Developer Attribution:** Clear attribution to the original developer throughout the application
- 🔐 **License Protection:** Built-in license key validation system

**Protected Files:**
- `.signature` (Backend & Frontend signature files)
- `api/lib/signature_guard.py` (Backend verification service)
- `frontend/src/utils/signatureGuard.js` (Frontend verification service)

**⚠️ WARNING:** Do not remove or modify the signature files or verification code. The application will not function without valid signatures.

---

## 📝 License & Attribution

**Developer:** kk  
**Project:** MINI AI Database Assistant (DocuMind)  
**Build Signature:** KK_2026_MINI_AUTH_PROTECTED  
**Copyright:** © 2026 kk. All rights reserved.

This project is the intellectual property of kk. Unauthorized use, distribution, or modification without proper attribution is prohibited.

---

## 🤝 Contact

For inquiries, collaboration, or licensing questions, please contact the developer.

**kk**  
Project: MINI AI Database Assistant