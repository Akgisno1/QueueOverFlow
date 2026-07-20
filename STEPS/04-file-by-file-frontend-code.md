# 04) File-By-File Frontend Code (Chat-First Jobs Page)

This file gives you **exact UI implementation** with your existing styling conventions.

---

## Step 4.1 — Replace Jobs page with chat-first layout

### File: `app/(root)/jobs/page.tsx`

1. Open this file.
2. Delete old imports for `JobCard`, `JobsFilter`, `Pagination`, `LocalSearchbar`, and `job.action` fetch functions.
3. Replace entire file with:

```tsx
import JobsRagChat from "@/components/jobs/JobsRagChat";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs AI Coach | QueueOverflow",
  description:
    "Analyze your resume, get improvements, and find jobs with AI-powered RAG chat.",
};

const JobsPage = () => {
  return <JobsRagChat />;
};

export default JobsPage;
```

---

## Step 4.2 — Create resume submit card

### File: `components/jobs/ResumeSubmitCard.tsx` (new)

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ResumeSubmitCard = ({ value, onChange, onSubmit, isSubmitting }: Props) => {
  return (
    <section className="background-light900_dark200 light-border shadow-light100_darknone rounded-lg border p-6 sm:p-8">
      <h2 className="h2-semibold text-dark100_light900">Paste your resume</h2>
      <p className="paragraph-regular text-dark500_light700 mt-2">
        Paste plain text only. Minimum 200 characters.
      </p>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: John Doe, Software Engineer, skills, experience..."
        className="background-light700_dark400 light-border-2 text-dark300_light700 placeholder mt-5 min-h-[280px] resize-y border px-4 py-3"
      />

      <div className="mt-5 flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || value.trim().length < 200}
          className="primary-gradient text-white"
        >
          {isSubmitting ? "Analyzing Resume..." : "Analyze Resume"}
        </Button>
      </div>
    </section>
  );
};

export default ResumeSubmitCard;
```

---

## Step 4.3 — Create message list with top loader + infinite scroll

### File: `components/jobs/JobsRagMessageList.tsx` (new)

```tsx
"use client";

import { useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: { jobs?: { title: string; url: string; snippet: string }[] } | null;
  createdAt?: string | Date;
}

interface Props {
  messages: ChatMessage[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const JobsRagMessageList = ({
  messages,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevHeightRef = useRef<number>(0);
  const shouldStickBottomRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

  const onScroll = () => {
      const nearTop = el.scrollTop < 40;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      shouldStickBottomRef.current = nearBottom;

      if (nearTop && hasMore && !isLoadingMore) {
        prevHeightRef.current = el.scrollHeight;
        onLoadMore();
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isLoadingMore) return;

    if (prevHeightRef.current > 0) {
      const delta = el.scrollHeight - prevHeightRef.current;
      el.scrollTop = delta;
      prevHeightRef.current = 0;
      return;
    }

    if (shouldStickBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoadingMore]);

  return (
    <div
      ref={containerRef}
      className="background-light800_darkgradient light-border mt-4 max-h-[55vh] min-h-[360px] overflow-y-auto rounded-lg border p-4"
    >
      {isLoadingMore && (
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <span className="small-medium text-dark500_light700">Loading older messages...</span>
        </div>
      )}

      {messages.length === 0 ? (
        <p className="paragraph-regular text-dark500_light700 text-center">
          Ask anything about your resume to begin.
        </p>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 rounded-lg p-3 ${
              msg.role === "user"
                ? "background-light900_dark300 ml-8"
                : "background-light900_dark200 mr-8"
            }`}
          >
            <p className="small-semibold text-dark400_light800 mb-1 uppercase">
              {msg.role}
            </p>
            <p className="paragraph-regular text-dark300_light700 whitespace-pre-wrap">
              {msg.content}
            </p>

            {msg.meta?.jobs && msg.meta.jobs.length > 0 && (
              <div className="mt-3 space-y-2">
                {msg.meta.jobs.map((job) => (
                  <a
                    key={job.url}
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="body-medium primary-text-gradient block underline"
                  >
                    {job.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default JobsRagMessageList;
```

---

## Step 4.4 — Create composer with prompt chips

### File: `components/jobs/JobsRagComposer.tsx` (new)

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PROMPT_SUGGESTIONS = [
  "Find mistakes in my resume",
  "Suggest improvements",
  "Suggest ATS-friendly bullet points",
  "Find jobs for this resume",
  "Suggest skills I should add",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: (message?: string) => void;
  isSending: boolean;
}

const JobsRagComposer = ({ value, onChange, onSend, isSending }: Props) => {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {PROMPT_SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSend(prompt)}
            disabled={isSending}
            className="background-light800_dark400 text-dark500_light700 small-medium rounded-full px-3 py-1.5"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-3">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask about your resume or describe job preferences (remote, pay, location)..."
          className="background-light700_dark400 light-border-2 text-dark300_light700 min-h-[90px] border px-4 py-3"
        />
        <Button
          onClick={() => onSend()}
          disabled={isSending || !value.trim()}
          className="primary-gradient h-[90px] px-6 text-white"
        >
          {isSending ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
};

export default JobsRagComposer;
```

---

## Step 4.5 — Create main orchestrator component

### File: `components/jobs/JobsRagChat.tsx` (new)

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import ResumeSubmitCard from "./ResumeSubmitCard";
import JobsRagMessageList, { ChatMessage } from "./JobsRagMessageList";
import JobsRagComposer from "./JobsRagComposer";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const JobsRagChat = () => {
  const [session, setSession] = useState<any>(null);
  const [resumeInput, setResumeInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmittingResume, setIsSubmittingResume] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadMessages = useCallback(async (opts?: { cursor?: string; prepend?: boolean }) => {
    const params = new URLSearchParams({ limit: "20" });
    if (opts?.cursor) params.set("cursor", opts.cursor);

    const res = await fetch(`/api/jobs/messages?${params.toString()}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load messages");

    const incoming: ChatMessage[] = json.data.messages;
    setCursor(json.data.nextCursor);
    setHasMore(json.data.hasMore);

    if (opts?.prepend) {
      setMessages((prev) => [...incoming, ...prev]);
    } else {
      setMessages(incoming);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    try {
      const sessionRes = await fetch("/api/jobs/session");
      const sessionJson = await sessionRes.json();

      if (!sessionJson.ok) throw new Error(sessionJson.error);

      const activeSession = sessionJson.data.session;
      setSession(activeSession || null);

      if (activeSession) {
        await loadMessages();
      }
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setIsBootstrapping(false);
    }
  }, [loadMessages]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const submitResume = async () => {
    setIsSubmittingResume(true);
    try {
      const res = await fetch("/api/jobs/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: resumeInput }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      const sessionRes = await fetch("/api/jobs/session");
      const sessionJson = await sessionRes.json();
      setSession(sessionJson.data.session);
      setMessages([]);
      setCursor(null);
      setHasMore(false);

      toast({ title: "Resume analyzed successfully" });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingResume(false);
    }
  };

  const sendMessage = async (preset?: string) => {
    const content = (preset ?? chatInput).trim();
    if (!content || isSending) return;

    setIsSending(true);
    setChatInput("");

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const res = await fetch("/api/jobs/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setMessages((prev) => [...prev, json.data.message]);
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const loadOlder = async () => {
    if (!cursor || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      await loadMessages({ cursor, prepend: true });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const resetChat = async () => {
    try {
      const res = await fetch("/api/jobs/session", { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setSession(null);
      setResumeInput("");
      setMessages([]);
      setChatInput("");
      setCursor(null);
      setHasMore(false);

      toast({ title: "Chat reset. You can submit a new resume." });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    }
  };

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1-bold text-dark100_light900">Jobs AI Coach</h1>
        {session && (
          <Button
            onClick={resetChat}
            className="btn light-border-2 text-dark500_light700"
          >
            Reset Chat
          </Button>
        )}
      </div>

      {!session ? (
        <div className="mt-8">
          <ResumeSubmitCard
            value={resumeInput}
            onChange={setResumeInput}
            onSubmit={submitResume}
            isSubmitting={isSubmittingResume}
          />
        </div>
      ) : (
        <>
          <JobsRagMessageList
            messages={messages}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadOlder}
          />
          <JobsRagComposer
            value={chatInput}
            onChange={setChatInput}
            onSend={sendMessage}
            isSending={isSending}
          />
        </>
      )}
    </section>
  );
};

export default JobsRagChat;
```

---

## Step 4.6 — Styling conventions used (match your project)

You are reusing existing utility classes from `styles/theme.css`:

- `background-light900_dark200` for cards
- `background-light800_darkgradient` for chat container
- `text-dark100_light900`, `text-dark500_light700` for typography
- `primary-gradient` for main CTA buttons
- `light-border`, `light-border-2` for borders

This keeps Jobs page visually consistent with Question/Community pages.

---

## Step 4.7 — Frontend manual test flow

1. Sign in.
2. Open `/jobs`.
3. Paste resume (200+ chars) -> click **Analyze Resume**.
4. Ask: `Find mistakes in my resume`.
5. Ask: `Find remote React jobs in India with 8-12 LPA`.
6. Refresh page:
   - chat should reload last 20 messages.
7. Scroll to top:
   - older messages load with spinner.
8. Click **Reset Chat**:
   - resume form returns.
9. Submit new resume and confirm new chat starts.

---

## Step 4.8 — Common frontend issues and fixes

| Problem | Fix |
|---------|-----|
| 401 on API calls | Ensure signed in and Clerk middleware not blocking routes |
| Messages not loading | Check `/api/jobs/messages` response in browser Network tab |
| Spinner never stops | Verify `hasMore` and `cursor` logic in API |
| Prompt chips do nothing | Ensure `onSend(prompt)` is wired in composer |
| Styling looks off | Confirm classes match `styles/theme.css` utilities |

Next: `05-deployment-vercel-docker-k8s.md`.
