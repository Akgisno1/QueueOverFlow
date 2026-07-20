# QueueOverFlow Jobs RAG Implementation Guide

This folder is your complete build manual for the Jobs RAG chatbot.

## What you are building

A chat-first `/jobs` page where logged-in users:

1. Paste resume text
2. Chat with an AI coach powered by RAG (Gemini + MongoDB vector search)
3. Ask for resume improvements and web job matches
4. Reload previous chat history (20 messages at a time)
5. Reset chat to delete resume/chunks/messages and start fresh

## Your selected stack

- LLM: **Google Gemini**
- Embeddings: **Gemini `text-embedding-004`**
- Vector DB: **MongoDB Atlas Vector Search** (no Pinecone/Weaviate)
- Web search: **Tavily API**
- Auth: **Clerk**
- Deployment: **Vercel**
- Learning extras: **Docker + Kubernetes**

## Read in this exact order

1. `01-setup-accounts-and-env.md`  
   Click-by-click setup for Gemini key, Atlas vector index, Tavily key, env vars.

2. `02-rag-concepts-and-data-model.md`  
   Learn RAG concepts and MongoDB schema design.

3. `03-file-by-file-backend-code.md`  
   Middleware, models, AI helpers, actions, API routes, OpenAI -> Gemini migration.

4. `04-file-by-file-frontend-code.md`  
   Chat-first UI, loaders, prompt chips, infinite scroll history.

5. `05-deployment-vercel-docker-k8s.md`  
   Vercel production deploy + Docker + Kubernetes learning path.

6. `06-testing-checklist.md`  
   Detailed test cases with expected results and debug table.

## Quick answer: are embeddings/chunks okay?

Yes. This is the standard RAG approach:

- **Chunk** = small resume section
- **Embedding** = numeric fingerprint of that section
- **Vector search** = find best matching sections for a question
- **Gemini** = final answer using only relevant context

This is more accurate and efficient than sending the entire resume every time.

## Important

These STEPS files are instructions for you to implement manually.
They include full code blocks and exact file paths so you can copy/paste and learn as you build.
