# 02) RAG Concepts And Data Model (Learn While Building)

This file teaches **what RAG is**, **why we use chunks/embeddings**, and **exactly what data we store in MongoDB**.

---

## 1) What is RAG in plain English?

**RAG = Retrieval-Augmented Generation**

Without RAG:
- You send full resume + full chat every time to Gemini.
- Expensive, slower, and model may miss details in long text.

With RAG:
1. Split resume into chunks.
2. Convert chunks to embeddings (numbers).
3. Store chunks + embeddings in MongoDB.
4. For each user question:
   - find most relevant resume chunks,
   - send only those chunks as context to Gemini,
   - Gemini answers using that focused context.

Think of it like:
- Resume = textbook
- Chunks = highlighted paragraphs
- Embedding = fingerprint of each paragraph
- Question = "which paragraphs are most related?"
- Gemini = tutor who reads only relevant paragraphs and answers

---

## 2) Your Jobs page end-to-end flow

```text
User opens /jobs
  -> Clerk checks login
  -> If no active session: show resume textarea
  -> User submits resume text
  -> Backend:
       1) save resume in resumesessions
       2) chunk resume
       3) embed each chunk
       4) save chunks in resumechunks
  -> Chat UI opens
  -> User asks question
  -> Backend:
       1) save user message
       2) embed question
       3) vector search top chunks
       4) optionally web search (Tavily) for job-finding prompts
       5) call Gemini with context
       6) save assistant message
  -> User returns later
  -> Frontend loads latest 20 messages
  -> Scroll up loads older 20
  -> Reset deletes session + messages + chunks + resume text
```

---

## 3) MongoDB collections you will add

You will create **3 new collections** (via Mongoose models):

| Collection | Purpose |
|------------|---------|
| `resumesessions` | One active resume chat per user |
| `resumechunks` | Chunked resume + embeddings for vector search |
| `jobchatmessages` | Chat history (user + assistant messages) |

Existing collection still used:
- `users` (linked by `userId` and `clerkId`)

---

## 4) Collection design in detail

## 4.1 `resumesessions`

One document = one resume analysis session.

Fields:
- `userId`: Mongo `_id` from `users` collection
- `clerkId`: Clerk user id (string)
- `resumeText`: full pasted resume text
- `status`: `"active"` or `"closed"`
- `createdAt`, `updatedAt`: automatic timestamps

Rule:
- Only **one active** session per user at a time.

Example document:

```json
{
  "_id": "665f0a2d9f1c2b001234abcd",
  "userId": "665e991d9f1c2b009999aaaa",
  "clerkId": "user_2abcXYZ",
  "resumeText": "John Doe\nSoftware Engineer...",
  "status": "active",
  "createdAt": "2026-06-17T10:00:00.000Z",
  "updatedAt": "2026-06-17T10:00:00.000Z"
}
```

## 4.2 `resumechunks`

One document = one chunk of resume + its embedding vector.

Fields:
- `sessionId`: links to `resumesessions._id`
- `userId`: owner
- `chunkIndex`: order (0,1,2...)
- `text`: chunk content
- `embedding`: number[] (length 768)

Example:

```json
{
  "sessionId": "665f0a2d9f1c2b001234abcd",
  "userId": "665e991d9f1c2b009999aaaa",
  "chunkIndex": 0,
  "text": "Software Engineer with 3 years in React, Node.js...",
  "embedding": [0.012, -0.034, 0.091, "... 768 numbers total"]
}
```

## 4.3 `jobchatmessages`

One document = one chat message.

Fields:
- `sessionId`
- `userId`
- `role`: `"user"` | `"assistant"` | `"system"`
- `content`: message text
- `meta` (optional): e.g. web job links returned by Tavily

Example:

```json
{
  "sessionId": "665f0a2d9f1c2b001234abcd",
  "userId": "665e991d9f1c2b009999aaaa",
  "role": "assistant",
  "content": "Here are 5 jobs matching your profile...",
  "meta": {
    "jobs": [
      { "title": "React Developer", "url": "https://...", "snippet": "..." }
    ]
  }
}
```

---

## 5) Chunking strategy (simple and effective)

Create helper logic in `lib/ai/jobs-rag.ts`:

- `CHUNK_SIZE = 700` characters
- `CHUNK_OVERLAP = 120` characters

Algorithm:
1. Start at index 0.
2. Take substring `[start, start + 700]`.
3. Next start = previous end - 120.
4. Continue until end of resume.

Why overlap?
- A skill mention at chunk boundary won't get lost.

Example:
- Resume length 2000 chars -> about 3-4 chunks.

---

## 6) Embedding strategy

For each chunk:
1. Send chunk text to Gemini embedding model `text-embedding-004`.
2. Receive vector (768 numbers).
3. Save in `embedding` field.

For each user question:
1. Embed question with same model.
2. Run Atlas `$vectorSearch` against `resumechunks`.
3. Retrieve top 4-6 chunks.

---

## 7) Chat memory strategy

You asked for:
- load last 20 messages on page open
- scroll up for older 20

Backend pagination design:
- Sort by `createdAt` descending.
- `limit=20`.
- `cursor` = `_id` or ISO timestamp of oldest message currently loaded.
- Response:

```json
{
  "messages": [...],
  "nextCursor": "665f...",
  "hasMore": true
}
```

Frontend behavior:
1. First fetch gives latest 20.
2. Reverse for display (oldest at top of visible list, newest near input) OR keep scroll anchored at bottom — choose bottom-anchored chat style.
3. On scroll to top, fetch older page and prepend.

---

## 8) Reset behavior (your requirement)

When user clicks **Reset Chat**:
1. Find active `resumesessions` doc.
2. Delete all `jobchatmessages` with that `sessionId`.
3. Delete all `resumechunks` with that `sessionId`.
4. Delete `resumesessions` doc itself.
5. UI returns to resume input screen.

This guarantees no old resume/chunks/messages remain.

---

## 9) Security rules

- Every API route must verify Clerk auth.
- Every DB query must filter by current user's `clerkId`/`userId`.
- Never return another user's session/messages/chunks.

---

## 10) What to do next

Open `03-file-by-file-backend-code.md` and implement:
1. models
2. AI helpers
3. server actions
4. API routes
5. middleware auth update
