"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";

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
  isSending: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const JobsRagMessageList = ({
  messages,
  isLoadingMore,
  isSending,
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
  }, [messages, isLoadingMore, isSending]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {isLoadingMore && (
          <div className="mb-6 flex items-center justify-center gap-2 py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <span className="small-medium text-dark500_light700">
              Loading older messages...
            </span>
          </div>
        )}

        {messages.length === 0 && !isSending ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <div className="background-light800_dark400 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
              <Bot className="h-7 w-7 text-primary-500" />
            </div>
            <h3 className="h3-semibold text-dark100_light900">
              How can I help with your resume?
            </h3>
            <p className="paragraph-regular text-dark500_light700 mt-2 max-w-md">
              Ask for improvements, ATS tips, skill suggestions, or job matches
              based on your uploaded resume.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="flex max-w-[85%] items-start gap-3">
                    <div className="background-light800_dark400 text-dark300_light700 rounded-3xl px-5 py-3">
                      <p className="paragraph-regular whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                    <div className="background-light700_dark300 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <User className="text-dark500_light700 h-4 w-4" />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start gap-4">
                  <div className="primary-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="paragraph-regular text-dark300_light700 whitespace-pre-wrap leading-7">
                      {msg.content}
                    </p>

                    {msg.meta?.jobs && msg.meta.jobs.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="small-semibold text-dark400_light800">
                          Job links found
                        </p>
                        {msg.meta.jobs.map((job) => (
                          <a
                            key={job.url}
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            className="background-light900_dark200 light-border block rounded-xl border p-4 transition hover:opacity-90"
                          >
                            <p className="body-semibold primary-text-gradient">
                              {job.title}
                            </p>
                            <p className="body-regular text-dark500_light700 mt-1 line-clamp-2">
                              {job.snippet}
                            </p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {isSending && (
              <div className="flex items-start gap-4">
                <div className="primary-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-sm">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <span className="background-light850_dark100 h-2 w-2 animate-bounce rounded-full" />
                  <span className="background-light850_dark100 h-2 w-2 animate-bounce rounded-full [animation-delay:0.15s]" />
                  <span className="background-light850_dark100 h-2 w-2 animate-bounce rounded-full [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsRagMessageList;
