"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import ResumeSubmitCard from "./ResumeSubmitCard";
import JobsRagMessageList, { ChatMessage } from "./JobsRagMessageList";
import JobsRagComposer from "./JobsRagComposer";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { parseApiResponse } from "@/lib/parse-api-response";

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

  const loadMessages = useCallback(
    async (opts?: { cursor?: string; prepend?: boolean }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (opts?.cursor) params.set("cursor", opts.cursor);

      const res = await fetch(`/api/jobs/messages?${params.toString()}`);
      const json = await parseApiResponse<{
        ok: boolean;
        error?: string;
        data: {
          messages: ChatMessage[];
          nextCursor: string | null;
          hasMore: boolean;
        };
      }>(res);

      if (!json.ok) throw new Error(json.error || "Failed to load messages");

      setCursor(json.data.nextCursor);
      setHasMore(json.data.hasMore);

      if (opts?.prepend) {
        setMessages((prev) => [...json.data.messages, ...prev]);
      } else {
        setMessages(json.data.messages);
      }
    },
    []
  );

  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    try {
      const sessionRes = await fetch("/api/jobs/session");
      const sessionJson = await parseApiResponse<{
        ok: boolean;
        error?: string;
        data: { session: any };
      }>(sessionRes);

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
      const json = await parseApiResponse<{ ok: boolean; error?: string }>(res);
      if (!json.ok) throw new Error(json.error);

      const sessionRes = await fetch("/api/jobs/session");
      const sessionJson = await parseApiResponse<{
        ok: boolean;
        data: { session: any };
      }>(sessionRes);

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
    if (!preset) setChatInput("");

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const res = await fetch("/api/jobs/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      const json = await parseApiResponse<{
        ok: boolean;
        error?: string;
        data: { message: ChatMessage };
      }>(res);

      if (!json.ok) throw new Error(json.error);

      setMessages((prev) => [...prev, json.data.message]);
    } catch (error: any) {
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== tempUserMessage.id)
      );
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
      const json = await parseApiResponse<{ ok: boolean; error?: string }>(res);
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="h1-bold text-dark100_light900">Jobs AI Coach</h1>
          <p className="paragraph-regular text-dark500_light700 mt-2">
            Upload your resume text to start a personalized coaching chat.
          </p>
        </div>
        <ResumeSubmitCard
          value={resumeInput}
          onChange={setResumeInput}
          onSubmit={submitResume}
          isSubmitting={isSubmittingResume}
        />
      </section>
    );
  }

  return (
    <section className="background-light900_dark200 light-border shadow-light100_darknone flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-xl border">
      <header className="light-border flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="h3-semibold text-dark100_light900">Jobs AI Coach</h1>
          <p className="small-regular text-dark500_light700">
            Resume loaded • Ask anything about jobs or improvements
          </p>
        </div>
        <Button
          onClick={resetChat}
          variant="ghost"
          className="text-dark500_light700 hover:text-dark300_light700 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Chat
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        <JobsRagMessageList
          messages={messages}
          isLoadingMore={isLoadingMore}
          isSending={isSending}
          hasMore={hasMore}
          onLoadMore={loadOlder}
        />
      </div>

      <JobsRagComposer
        value={chatInput}
        onChange={setChatInput}
        onSend={sendMessage}
        isSending={isSending}
      />
    </section>
  );
};

export default JobsRagChat;
