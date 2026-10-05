# 🎓 One Front Door — AI-Powered University Assistant

> A production-grade, multi-agent RAG (Retrieval-Augmented Generation) system that acts as a unified intelligent assistant for university students — answering questions about academics, campus rules, exam policies, attendance, and more.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-FF6B35)](https://langchain-ai.github.io/langgraphjs/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC143C)](https://qdrant.tech/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white)](https://redis.io/)

---

## 📌 Overview

One Front Door solves a common student pain point: information is scattered across handbooks, portals, and PDFs. This system ingests all university documents (syllabi, exam manuals, discipline rules, attendance policies) into a **vector database**, then routes student queries through a **LangGraph multi-agent pipeline** to deliver precise, cited answers in seconds.

### What makes it stand out:
- 🧠 **Multi-agent orchestration** with LangGraph — specialized agents for academic, campus, and general queries
- ⚡ **Sub-1s cache hits** via multi-tier Redis caching (global + conversation-scoped)
- 🔍 **RAG with Qdrant** — semantic search over 1,700+ university document chunks
- 🔐 **Google OAuth2** authentication via Passport.js
- 📊 **Full-stack TypeScript monorepo** with pnpm workspaces

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│              (Vite + TypeScript + CSS Animations)           │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (Express 5)
┌────────────────────────▼────────────────────────────────────┐
│                     API Backend (Node.js)                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Multi-Tier Redis Cache                    │    │
│  │   Global Cache (factual) + Session Cache (context)  │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │ cache miss                           │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │         LangGraph Orchestrator (Sequential)          │    │
│  │                                                      │    │
│  │   ┌──────────┐  ┌──────────┐  ┌────────────────┐   │    │
│  │   │ Analyze  │→ │ Execute  │→ │  Synthesize    │   │    │
│  │   │  Node    │  │  Node    │  │    Node        │   │    │
│  │   └──────────┘  └────┬─────┘  └────────────────┘   │    │
│  │                      │                               │    │
│  │         ┌────────────┼─────────────┐                │    │
│  │         ▼            ▼             ▼                │    │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │   │ Academic │ │  Campus  │ │ General  │           │    │
│  │   │  Agent   │ │  Agent   │ │  Agent   │           │    │
│  │   └────┬─────┘ └────┬─────┘ └──────────┘           │    │
│  │        └──────┬──────┘                              │    │
│  │               ▼                                      │    │
│  │         ┌──────────┐                                │    │
│  │         │  Qdrant  │ (Vector Similarity Search)     │    │
│  │         │ 1,729 chunks                              │    │
│  │         └──────────┘                                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Agent Responsibilities

| Agent | Handles | Tools |
|-------|---------|-------|
| **Academic Agent** | Course syllabus, credit hours, subjects, program structure | `search_academic_info` |
| **Campus Agent** | Discipline rules, conduct policies, campus facilities | `search_campus_rules_and_policies`, `search_campus_locations` |
| **General Agent** | Greetings, fallback, off-topic responses | LLM direct response |
| **Orchestrator** | Query analysis, agent routing, response synthesis | Manages all agents via LangGraph |

---

## 🚀 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + TypeScript** | Runtime & type safety |
| **Express 5** | REST API server |
| **LangGraph.js** | Multi-agent orchestration graph |
| **LangChain.js** | LLM abstractions, document loaders, text splitters |
| **Google Gemini / Groq** | LLM providers (fast inference) |
| **Qdrant** | Vector database for semantic search |
| **Redis** | Multi-tier response caching |
| **PostgreSQL + Prisma** | Session persistence & user data |
| **Passport.js + Google OAuth2** | Authentication |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18 + TypeScript** | UI framework |
| **Vite** | Build tooling |
| **Vanilla CSS** | Custom animations & glassmorphism design |

### RAG Pipeline
| Stage | Implementation |
|-------|---------------|
| **Ingestion** | PDFLoader + OCR fallback |
| **Chunking** | RecursiveCharacterTextSplitter (1200 chars, 200 overlap) |
| **Metadata Enrichment** | Auto-classify document type, extract course codes |
| **Embedding** | Google text-embedding-004 (3072 dims) |
| **Retrieval** | Qdrant cosine similarity, top-k with metadata filtering |

---

## 📁 Project Structure

```
one-front-door/
├── apps/
│   ├── api/                        # Express backend
│   │   └── src/
│   │       ├── agents/
│   │       │   ├── orchestrator/   # LangGraph graph + nodes
│   │       │   ├── academic/       # Syllabus RAG agent
│   │       │   ├── campus/         # Campus rules agent
│   │       │   └── general/        # General fallback agent
│   │       ├── rag/
│   │       │   ├── ingestion/      # PDF loading & chunking
│   │       │   ├── embeddings/     # Embedding model config
│   │       │   ├── metadata/       # Chunk metadata enrichment
│   │       │   ├── retrieval/      # Qdrant retriever
│   │       │   └── vectorstore/    # Ingest scripts
│   │       ├── chat/               # Chat service + caching
│   │       ├── auth/               # Google OAuth2 routes
│   │       └── db/                 # Prisma + Redis config
│   └── web/                        # React frontend
│       └── src/
│           ├── App.tsx             # Main chat interface
│           ├── Login.tsx           # Auth page
│           └── services/           # API client
├── data/
│   ├── documents/                  # Source PDFs
│   └── processed/                  # Generated chunks
└── packages/
    └── shared-types/               # Shared TypeScript types
```

---

## ⚡ Key Engineering Decisions

### 1. Multi-Tier Caching Strategy
- **Global Cache** — factual questions shared across all users (TTL: 24h)
- **Conversation Cache** — context-dependent questions keyed by sessionId (TTL: 1h)
- **Pronoun detection** forces conversation-scoped cache for queries using "it", "that", "this"
- Cache hits: **sub-1 second** vs cold LLM: **5-30 seconds**

### 2. LangGraph Fast-Paths
Two fast-paths reduce latency significantly:
- **Standalone question fast-path**: Skip LLM routing analysis → direct agent call
- **Single-result fast-path**: Skip synthesizer LLM → return directly

### 3. Incremental RAG Ingestion
Custom incremental pipeline processes only new PDFs and merges with existing chunks, avoiding full re-embedding. Uses deterministic SHA-256 Qdrant point IDs for idempotent upserts.

---

## 🛠️ Setup & Running Locally

### Prerequisites
- Node.js 20+, pnpm 9+, Docker
- Google Cloud project (OAuth2 + Gemini API key), Groq API key

### Quick Start
```bash
git clone https://github.com/your-username/one-front-door.git
cd one-front-door
pnpm install

# Start local vector DB & cache (Qdrant on 6333, Redis on 6380)
docker compose up -d

# Setup DB (Applies migrations to Cloud Neon DB PostgreSQL)
cd apps/api && npx prisma migrate deploy

# Ingest documents into Qdrant
pnpm --filter api rag:prepare
pnpm --filter api rag:ingest

# Run Application
pnpm dev:api      # Backend  → http://localhost:5000
pnpm dev:web      # Frontend → http://localhost:5173
```

See `.env.example` for required environment variables.

---

## 📚 RAG Document Coverage

| Document | Type | Chunks |
|----------|------|--------|
| B.Tech CSE Syllabus 2025-29 | `syllabus` | ~750 |
| BBA LLB Syllabus 2023-28 | `syllabus` | ~730 |
| Examination Manual 2024-25 | `examination_manual` | ~138 |
| Students Discipline & Conduct Rules | `discipline_rules` | ~56 |
| Attendance Notification | `attendance_notification` | ~2 |
| Bennett University Brochure | `brochure` | ~52 |
| **Total** | | **~1,729** |

---

## 🔮 Potential Improvements
- [ ] Streaming responses via SSE
- [ ] Persistent conversation history in PostgreSQL
- [ ] RAG evaluation with RAGAS metrics
- [ ] Docker Compose for one-command setup
- [ ] GitHub Actions CI/CD pipeline
- [ ] Cross-encoder re-ranking post retrieval

---

*Built with ❤️ for Bennett University students*
