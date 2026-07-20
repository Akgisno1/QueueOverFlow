"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ResumeSubmitCard = ({
  value,
  onChange,
  onSubmit,
  isSubmitting,
}: Props) => {
  return (
    <section className="background-light900_dark200 light-border shadow-light100_darknone rounded-2xl border p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="primary-gradient flex h-10 w-10 items-center justify-center rounded-xl">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="h3-semibold text-dark100_light900">Paste your resume</h2>
          <p className="small-regular text-dark500_light700">
            Plain text only • minimum 200 characters
          </p>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: John Doe, Software Engineer with 3 years experience in React, Node.js, MongoDB..."
        className="background-light800_dark400 light-border-2 text-dark300_light700 placeholder min-h-[320px] resize-y border px-4 py-3 text-base"
      />

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="small-regular text-dark500_light700">
          {value.trim().length}/200 characters minimum
        </p>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || value.trim().length < 200}
          className="primary-gradient px-6 text-white"
        >
          {isSubmitting ? "Analyzing Resume..." : "Analyze Resume"}
        </Button>
      </div>
    </section>
  );
};

export default ResumeSubmitCard;
