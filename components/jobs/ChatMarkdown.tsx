"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";

interface Props {
  content: string;
}

const ChatMarkdown = ({ content }: Props) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="h3-bold text-dark100_light900 mb-3 mt-5 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="h3-semibold text-dark100_light900 mb-2 mt-5 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="base-semibold text-dark200_light900 mb-2 mt-4 first:mt-0">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="paragraph-regular text-dark300_light700 mb-3 leading-7 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 ml-5 list-disc space-y-1.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-5 list-decimal space-y-1.5">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="paragraph-regular text-dark300_light700 leading-7">
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong className="text-dark200_light900 font-semibold">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="text-dark400_light800 italic">{children}</em>
        ),
        hr: () => <hr className="light-border my-5 border-t" />,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="body-medium primary-text-gradient inline-flex items-center gap-1 underline underline-offset-2"
          >
            {children}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="background-light800_dark400 light-border my-3 border-l-4 py-1 pl-4 italic">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="background-light800_dark400 rounded px-1.5 py-0.5 font-mono text-sm">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default ChatMarkdown;
