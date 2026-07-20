# 06) Testing Checklist (Detailed How-To)

Use this after implementing Steps 03 and 04.

---

## 1) Auth protection test

### Goal
`/jobs` must require login.

### Steps
1. Sign out from app.
2. Visit `http://localhost:3000/jobs`.
3. Expected: redirect to Clerk sign-in page.

### Pass criteria
- [ ] Anonymous users cannot access jobs chat UI.

---

## 2) Resume submit + chunk creation test

### Goal
Resume text is saved and chunked in MongoDB.

### Steps
1. Sign in.
2. Open `/jobs`.
3. Paste resume text with at least 200 characters.
4. Click **Analyze Resume**.
5. Wait for success toast.

### Verify in MongoDB Atlas
1. Atlas > Browse Collections > `QueueOverFlow`.
2. Check `resumesessions`:
   - one active doc for your user.
3. Check `resumechunks`:
   - multiple docs with `embedding` arrays.

### Pass criteria
- [ ] Session created
- [ ] Chunks created
- [ ] Chat UI appears

---

## 3) Basic RAG chat test

### Goal
Assistant answers based on resume context.

### Steps
1. Click prompt chip: `Find mistakes in my resume`.
2. Wait for assistant response.

### Expected
- Response mentions specific content from your resume (skills, projects, etc.).

### Pass criteria
- [ ] Relevant resume-aware answer returned
- [ ] User + assistant messages saved in `jobchatmessages`

---

## 4) Web jobs search test

### Goal
Job-finding prompt triggers Tavily and returns up to 10 links.

### Steps
1. Send:
   `Find remote React developer jobs in India, hybrid preferred, salary 10-15 LPA`
2. Wait for response.

### Expected
- Assistant message includes job links.
- `meta.jobs` may contain structured links.

### Pass criteria
- [ ] At least 1 job URL returned
- [ ] No more than 10 links shown

---

## 5) Reload chat history test (last 20)

### Goal
Returning to page reloads recent chat history.

### Steps
1. Send at least 3 messages.
2. Refresh browser on `/jobs`.

### Expected
- Last messages visible without re-submitting resume.

### Pass criteria
- [ ] Session persists
- [ ] Last 20 messages loaded

---

## 6) Infinite scroll older messages test

### Goal
Scrolling up loads previous 20 with spinner.

### Preparation
- Send 25+ messages (can use repeated short prompts while testing).

### Steps
1. Open `/jobs`.
2. Scroll to top of chat container.
3. Observe top spinner.
4. Confirm older messages appear above current ones.

### Pass criteria
- [ ] Spinner appears while loading
- [ ] Older batch appended
- [ ] Scroll position remains stable (no jump)

---

## 7) Reset chat deletion test

### Goal
Reset removes resume, chunks, and messages.

### Steps
1. Click **Reset Chat**.
2. Confirm UI returns to resume textarea.
3. In Atlas, verify for your user/session:
   - no active `resumesessions`
   - no related `resumechunks`
   - no related `jobchatmessages`

### Pass criteria
- [ ] UI reset works
- [ ] DB records deleted

---

## 8) New resume after reset test

### Goal
User can start a completely new session.

### Steps
1. Submit a different resume text.
2. Ask a question.
3. Confirm responses reference new resume content.

### Pass criteria
- [ ] New session created
- [ ] Old context not leaked

---

## 9) Question page Gemini migration test

### Goal
Old OpenAI button now uses Gemini.

### Steps
1. Open any question page while logged in.
2. Click **Generate AI Answer**.
3. Wait for generated content in editor.

### Pass criteria
- [ ] No OpenAI key error
- [ ] Gemini response inserted

---

## 10) Security test

### Goal
User cannot access another user's session/messages.

### Steps
1. Use User A account, create session.
2. Sign out, sign in as User B.
3. User B should only see own session/messages.

### Pass criteria
- [ ] Data isolation by `clerkId`/`userId`

---

## 11) Error handling test

### Missing keys simulation
1. Temporarily remove `TAVILY_API_KEY` locally.
2. Send job-search prompt.
3. Expect clear toast/error (not app crash).

### Short resume
1. Submit <200 chars.
2. Expect validation error toast.

### Pass criteria
- [ ] Graceful errors
- [ ] UI remains usable

---

## 12) Production (Vercel) smoke test

After deploy:

1. Login on production URL.
2. Submit resume.
3. Chat.
4. Refresh page.
5. Reset chat.

### Pass criteria
- [ ] All core flows work in production

---

## If something fails, debug here first

| Symptom | Likely cause | Where to check |
|---------|--------------|----------------|
| 401 Unauthorized | Clerk auth missing | `middleware.ts`, API `auth()` |
| Vector search error | Atlas index missing/inactive | Atlas Search Indexes |
| Embedding error | Gemini key/model issue | `.env.local`, `lib/ai/jobs-rag.ts` |
| No web jobs | Tavily key/query issue | `lib/ai/web-search.ts` |
| Messages not paginating | cursor logic | `getSessionMessages` + frontend scroll handler |
