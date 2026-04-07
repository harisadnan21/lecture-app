# LectureAI

An AI-powered academic assistant that turns lecture recordings and meeting audio into structured study materials — instantly.

Upload a recording or paste a transcript and get back: formatted notes, flashcards, a quiz, and an AI tutor that answers questions strictly from your lecture content. Also works for meetings, producing summaries, action items, and decisions.

---

## What it does

**For lectures:**
- Transcribes audio/video files using OpenAI Whisper
- Generates structured markdown notes (overview, key concepts, detailed notes, summary)
- Creates 8–10 flashcards (front: term/concept, back: explanation)
- Generates a 5-question multiple-choice quiz
- Embeds the transcript for semantic search, enabling an AI tutor that answers only from your lecture

**For meetings (Google Meet, Zoom, etc.):**
- Records live browser tab audio via screen capture
- Generates a meeting summary with topics, decisions, action items, and next steps
- Extracts structured data: owners, due dates, attendees
- AI tutor can answer questions about what was discussed

**Input methods:**
| Method | How |
|---|---|
| File upload | MP3, MP4, M4A, WebM, WAV — transcribed via Whisper |
| Paste transcript | Raw text, no transcription needed |
| Microphone recording | Record live from your laptop mic in-browser |
| Screen capture | Capture browser tab audio from Google Meet / Zoom |

> **Note on screen capture:** You must share a browser **tab** (not a window or full screen) and check "Also share tab audio." macOS does not allow browsers to capture system audio.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Auth | Supabase Auth (email/password) with SSR cookie sessions |
| Database | Supabase (Postgres) with Row Level Security |
| Vector search | pgvector — 1536-dimension embeddings via IVFFlat index |
| File storage | Supabase Storage (`lectures` bucket) |
| AI — transcription | OpenAI Whisper (`whisper-1`) |
| AI — generation | OpenAI GPT-4o |
| AI — embeddings | OpenAI `text-embedding-3-small` |

---

## Architecture

```
Browser
  │
  ├── /                     Landing page
  ├── /auth/login           Sign in
  ├── /auth/signup          Sign up
  ├── /dashboard            List of all lectures/meetings
  └── /lecture/[id]         Detail view (notes, flashcards, quiz, AI tutor)
        │
        └── AddContentModal  Multi-step modal to add content
              ├── Type:  Lecture or Meeting
              ├── Mode:  Upload file / Paste transcript / Record mic / Capture screen
              └── Input: Title + submit

Server (Next.js API routes)
  │
  ├── POST /api/generate    Orchestrates all AI processing for a lecture/meeting
  │     ├── Fetches file from Supabase Storage → sends to Whisper
  │     ├── Validates transcript (min 30 chars)
  │     ├── For lectures:  runs notes + flashcards + quiz generation in parallel
  │     ├── For meetings:  runs summary + structured extraction in parallel
  │     └── Chunks transcript → generates embeddings → stores in lecture_chunks
  │
  └── POST /api/chat        RAG-based AI tutor
        ├── Embeds the user question
        ├── Runs pgvector similarity search (threshold: 0.2, top 6 chunks)
        ├── Falls back to raw transcript if no vector matches found
        └── Sends context + question to GPT-4o (temperature: 0.2)
```

### RAG pipeline detail

The AI tutor uses Retrieval-Augmented Generation to answer strictly from lecture content:

1. At processing time, the transcript is split into 400-word overlapping chunks (50-word overlap)
2. Each chunk is embedded using `text-embedding-3-small` (1536 dimensions) and stored in `lecture_chunks` with a pgvector index
3. At query time, the user's question is embedded and a cosine similarity search runs against the lecture's chunks
4. The top matching chunks become the GPT-4o context window
5. If vector search returns nothing (e.g. embeddings not yet ready), the system falls back to using the raw transcript directly

---

## Database schema

```
users (managed by Supabase Auth)

lectures
  id            UUID PK
  user_id       UUID → auth.users
  title         TEXT
  transcript    TEXT
  file_url      TEXT
  status        pending | transcribing | processing | ready | error
  content_type  lecture | meeting
  source        upload | transcript | microphone | screen
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ (auto-updated via trigger)

notes
  id            UUID PK
  lecture_id    UUID → lectures
  content       TEXT (markdown)

flashcards
  id            UUID PK
  lecture_id    UUID → lectures
  front         TEXT
  back          TEXT

quiz_questions
  id            UUID PK
  lecture_id    UUID → lectures
  question      TEXT
  options       JSONB  (array of 4 strings)
  correct_answer TEXT

chat_messages
  id            UUID PK
  lecture_id    UUID → lectures
  user_id       UUID → auth.users
  role          user | assistant
  content       TEXT

lecture_chunks  (for RAG)
  id            UUID PK
  lecture_id    UUID → lectures
  content       TEXT
  embedding     vector(1536)
```

All tables have Row Level Security. Users can only access their own data. AI processing uses a service-role client that bypasses RLS.

---

## Project structure

```
lecture-app/
├── app/
│   ├── page.tsx                  Landing page
│   ├── layout.tsx                Root layout
│   ├── globals.css
│   ├── api/
│   │   ├── generate/route.ts     AI processing endpoint
│   │   └── chat/route.ts         RAG chat endpoint
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts     Supabase auth callback
│   ├── dashboard/page.tsx        Lecture list
│   └── lecture/[id]/page.tsx     Lecture detail page
├── components/
│   ├── AddContentModal.tsx       Multi-step upload/record modal
│   ├── LectureDetailClient.tsx   Tab layout for lecture/meeting views
│   ├── NotesPanel.tsx            Markdown notes renderer
│   ├── FlashcardsPanel.tsx       Flip card UI
│   ├── QuizPanel.tsx             Multiple choice quiz
│   ├── ChatPanel.tsx             AI tutor chat interface
│   ├── MeetingPanel.tsx          Meeting summary + action items
│   └── LectureCard.tsx           Dashboard card component
├── lib/supabase/
│   ├── client.ts                 Browser Supabase client
│   ├── server.ts                 Server + service-role clients
│   └── middleware.ts             Session refresh helper
├── middleware.ts                 Auth guard (redirects unauthenticated users)
├── types/database.ts             TypeScript interfaces
└── schema.sql                    Full DB schema with RLS policies
```

---

## Local setup

### Prerequisites
- Node.js 18+
- A Supabase project
- An OpenAI API key

### 1. Clone and install

```bash
git clone https://github.com/harisadnan21/lecture-app.git
cd lecture-app
npm install
```

### 2. Set up Supabase

Run `schema.sql` in your Supabase SQL editor to create all tables, indexes, RLS policies, and the `match_lecture_chunks` vector search function.

Then go to **Storage** in the Supabase dashboard and create a bucket named `lectures` (private).

### 3. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key design decisions

**Why service role for AI processing?**
Notes, flashcards, quiz questions, and embeddings are written by the server during processing — not by the user directly. Using the service role client for these writes bypasses RLS cleanly without granting users unnecessary write permissions.

**Why fall back to raw transcript in chat?**
pgvector similarity search can return empty results if the question phrasing doesn't closely match any chunk. Rather than giving a useless "I don't know" response, the system falls back to sending the full transcript (up to 14k chars) as context. This trades token cost for reliability.

**Why tab capture instead of screen capture for meetings?**
macOS does not expose system audio to browsers. Screen/window capture via `getDisplayMedia` gives you video but silent audio. Sharing a browser tab with "Also share tab audio" is the only way to capture Google Meet or Zoom audio in a browser without native app integrations.

**Chunk overlap in embeddings**
Transcripts are split with a 50-word overlap between 400-word chunks. This ensures that concepts mentioned near a chunk boundary are represented in both adjacent chunks, improving retrieval accuracy for the AI tutor.

---

## Out of scope (not built)

- Vercel / production deployment
- Weak area tracking or spaced repetition
- Personalized study plans
- Mobile app
- Payments / billing
