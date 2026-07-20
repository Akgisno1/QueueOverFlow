"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import React from "react";
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
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && value.trim()) onSend();
    }
  };

  return (
    <div className="light-border background-light900_dark200 border-t p-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-3 flex flex-wrap gap-2">
          {PROMPT_SUGGESTIONS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSend(prompt)}
              disabled={isSending}
              className="background-light800_dark400 text-dark500_light700 small-medium hover:background-light700_dark300 flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 transition disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary-500" />
              {prompt}
            </button>
          ))}
        </div>

        <div className="background-light800_dark400 light-border shadow-light100_darknone relative flex items-end rounded-[26px] border px-4 py-3">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message Jobs AI Coach..."
            disabled={isSending}
            className="text-dark300_light700 placeholder max-h-40 min-h-[24px] flex-1 resize-none bg-transparent py-1 pr-12 text-base outline-none"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />

          <button
            type="button"
            onClick={() => onSend()}
            disabled={isSending || !value.trim()}
            aria-label="Send message"
            className="primary-gradient absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        <p className="subtle-regular text-dark500_light700 mt-2 text-center">
          AI can make mistakes. Verify important job and resume details.
        </p>
      </div>
    </div>
  );
};

export default JobsRagComposer;
