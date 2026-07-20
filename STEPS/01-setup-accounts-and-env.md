# 01) Setup Accounts And Environment Variables

This is the **first file you should complete**. Do not skip steps. Every step tells you **which website to open**, **what to click**, and **what to paste into which file**.

---

## What you are setting up in this step

| Service | Why you need it |
|---------|-----------------|
| Google Gemini | Chat replies + resume embeddings |
| MongoDB Atlas | Store resume, messages, and vector chunks |
| Tavily | Web search for "find jobs" feature |
| `.env.local` | Local secrets for your Next.js app |

---

## A. Create your Google Gemini API key (detailed)

### A1. Open Google AI Studio

1. Open your browser.
2. Go to: [https://aistudio.google.com/](https://aistudio.google.com/)
3. Click **Sign in** (top-right) if you are not signed in.
4. Use your Google account (Gmail account works).

### A2. Accept terms (first-time users)

1. If Google shows a welcome/terms screen, read and click **Accept** or **Continue**.
2. You should land on the AI Studio dashboard.

### A3. Create API key

1. In the left sidebar, click **Get API key**  
   - If you do not see sidebar: click the menu icon (☰) first.
2. Click **Create API key**.
3. Choose one:
   - **Create API key in new project** (recommended for beginners), or
   - **Create API key in existing project** (if you already use Google Cloud).
4. Google shows your key once (looks like `AIza...`).
5. Click **Copy** immediately.
6. Save it temporarily in a secure note (Notepad is fine for now).

### A4. Restrict key (recommended, optional but good practice)

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select the project used for your key.
3. Click your API key name.
4. Under **API restrictions**, choose **Restrict key**.
5. Enable only:
   - **Generative Language API**
6. Click **Save**.

### A5. Add Gemini key to your project

1. In your project root (`E:/Github/QueueOverFlow/QueueOverFlow`), open or create `.env.local`.
2. Add this line:

```bash
GEMINI_API_KEY=AIza_your_real_key_here
```

3. Save the file.
4. **Never commit `.env.local` to GitHub** (your `.gitignore` should already ignore it).

### A6. Models you will use in code

- Chat model: `gemini-1.5-flash`
- Embedding model: `gemini-embedding-001` (768 dimensions via `outputDimensionality`)

---

## B. MongoDB Atlas setup (including Vector Search)

You already use MongoDB in this project (`lib/mongoose.ts`). We will extend it for RAG.

### B1. Open Atlas and sign in

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign in (or create a free account).
3. Open your existing project/cluster if you already have one.

### B2. Create cluster (only if you do not already have one)

1. Click **Build a Database** (or **Create**).
2. Choose **M0 Free** tier.
3. Pick a cloud provider/region close to you.
4. Cluster name can stay default.
5. Click **Create Deployment**.
6. Wait until status becomes **Active**.

### B3. Create database user

1. In Atlas left menu, click **Database Access**.
2. Click **Add New Database User**.
3. Authentication method: **Password**.
4. Username: e.g. `queueoverflow_user`.
5. Password: generate a strong password and save it.
6. Database User Privileges: **Read and write to any database**.
7. Click **Add User**.

### B4. Allow network access (important for local + Vercel)

1. Left menu: **Network Access**.
2. Click **Add IP Address**.
3. For development, click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - This is easiest while learning.
   - Later you can restrict IPs.
4. Click **Confirm**.

### B5. Copy MongoDB connection string

1. Left menu: **Database**.
2. Click **Connect** on your cluster.
3. Choose **Drivers**.
4. Driver: **Node.js**, version latest.
5. Copy connection string. It looks like:

```txt
mongodb+srv://queueoverflow_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. Replace `<password>` with your real DB user password.
7. Add this to `.env.local`:

```bash
MONGODB_URL=mongodb+srv://queueoverflow_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

> Your app already uses db name `QueueOverFlow` in `lib/mongoose.ts`, so no change needed there.

### B6. Verify local DB connection

1. In terminal, from project root:

```bash
npm run dev
```

2. Open app and perform any action that hits DB (login/profile/questions).
3. Check terminal logs for `MongoDB is connected`.

---

## C. Enable Atlas Vector Search index (for embeddings/chunks)

You asked if embeddings/chunks are fine — **yes**. This is exactly how production RAG systems work.

### C1. Why vector index is needed

- Each resume chunk gets an embedding (array of numbers).
- When user asks a question, we embed the question and find closest chunks.
- Atlas Vector Search does this fast using a special index.

### C2. Create the `resumechunks` collection first

You will create this collection automatically when your backend saves chunks.
But Atlas index UI needs a collection name, so do one of these:

**Option 1 (recommended):** implement backend chunk save first (Step 03), submit one resume, then create index.

**Option 2 (manual now):**
1. Atlas > **Database** > **Browse Collections**.
2. Select DB `QueueOverFlow`.
3. Click **Create Collection**.
4. Collection name: `resumechunks`.
5. Insert one dummy doc (optional), then delete later.

### C3. Create vector search index in Atlas UI

1. Atlas > **Database** > **Browse Collections**.
2. Open database `QueueOverFlow`.
3. Click collection `resumechunks`.
4. Open tab **Search Indexes**.
5. Click **Create Search Index**.
6. Choose **Atlas Vector Search**.
7. Click **Next**.
8. Index name: `resume_chunks_vector_idx`
9. Choose **JSON Editor**.
10. Paste:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "sessionId"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```

11. Click **Next** > **Create Search Index**.
12. Wait until index status is **Active** (can take a few minutes).

### C4. If index creation fails

- Confirm `numDimensions` is `768` for `gemini-embedding-001` with `outputDimensionality: 768`.
- Confirm collection name is exactly `resumechunks` (Mongoose lowercases/pluralizes model names).
- Confirm your cluster tier supports Vector Search (M10+ historically required; many M0 regions now support it — if unavailable, Atlas will show an error and you may need to upgrade or switch region).

---

## D. Create Tavily API key (web job search)

### D1. Sign up

1. Go to [https://tavily.com/](https://tavily.com/)
2. Click **Sign Up** / **Get Started**.
3. Create account with email or GitHub.
4. Verify email if required.

### D2. Generate API key

1. After login, open dashboard.
2. Find section **API Keys**.
3. Click **Create API Key** (or copy existing key).
4. Copy key (usually starts with `tvly-`).

### D3. Add to `.env.local`

```bash
TAVILY_API_KEY=tvly_your_real_key_here
```

### D4. Test Tavily quickly (optional)

Run this in terminal (replace key):

```bash
curl -X POST "https://api.tavily.com/search" ^
  -H "Content-Type: application/json" ^
  -d "{\"api_key\":\"tvly_your_key\",\"query\":\"remote react developer jobs india\",\"max_results\":3}"
```

If successful, you get JSON with `results`.

---

## E. Complete `.env.local` template

Your final local env should include at least:

```bash
# MongoDB
MONGODB_URL=mongodb+srv://...

# Clerk (already in your project)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI
GEMINI_API_KEY=AIza...
TAVILY_API_KEY=tvly...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Existing keys you may already have
NEXT_PUBLIC_TINY_EDITOR_API_KEY=...
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### Where each file uses these vars

| Variable | Used in |
|----------|---------|
| `MONGODB_URL` | `lib/mongoose.ts` |
| `GEMINI_API_KEY` | `lib/ai/jobs-rag.ts`, `app/api/chatgpt/route.ts` |
| `TAVILY_API_KEY` | `lib/ai/web-search.ts` |
| Clerk keys | `middleware.ts`, auth pages, server actions |
| `NEXT_PUBLIC_APP_URL` | frontend API calls if needed |

---

## F. Install required npm package

From project root:

```bash
npm install @google/generative-ai
```

Verify in `package.json` dependencies:

```json
"@google/generative-ai": "^0.x.x"
```

---

## G. Checklist before moving to Step 02

- [ ] Gemini API key created and added to `.env.local`
- [ ] MongoDB Atlas cluster is active
- [ ] DB user + network access configured
- [ ] `MONGODB_URL` works locally
- [ ] Tavily API key added
- [ ] `@google/generative-ai` installed
- [ ] Vector index created (or scheduled right after first chunk insert)

When all are checked, open `02-rag-concepts-and-data-model.md`.
