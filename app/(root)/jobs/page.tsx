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
