# 05) Deployment: Vercel + Docker + Kubernetes (Detailed)

This guide covers production deployment on Vercel (your main target) plus Docker/Kubernetes learning setup.

---

## Part A — Deploy to Vercel (primary)

## A1. Prepare your GitHub repository

1. Open terminal in project root.
2. Check status:

```bash
git status
```

3. Stage and commit your Jobs RAG changes:

```bash
git add .
git commit -m "Add Jobs RAG chat with Gemini and MongoDB vector search"
```

4. Push branch:

```bash
git push origin main
```

(Use your branch name if not `main`.)

---

## A2. Create/import Vercel project

1. Go to [https://vercel.com/](https://vercel.com/)
2. Sign in with GitHub.
3. Click **Add New...** > **Project**.
4. Import `QueueOverFlow` repository.
5. Framework should auto-detect **Next.js**.
6. Keep default build settings:
   - Build Command: `next build`
   - Output: default
7. Do **not** deploy yet — add env vars first.

---

## A3. Add environment variables in Vercel

In project setup (or Settings > Environment Variables), add:

| Name | Value | Environments |
|------|-------|--------------|
| `MONGODB_URL` | Atlas connection string | Production, Preview, Development |
| `GEMINI_API_KEY` | Google AI Studio key | Production, Preview, Development |
| `TAVILY_API_KEY` | Tavily key | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Production, Preview, Development |
| `CLERK_SECRET_KEY` | Clerk secret key | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |
| `NEXT_PUBLIC_SERVER_URL` | `https://your-app.vercel.app` | Production |

Also add any existing vars your app already needs (TinyMCE, RapidAPI, etc.).

Click **Save**.

---

## A4. Deploy

1. Click **Deploy**.
2. Wait for build completion.
3. Open generated URL.

---

## A5. Post-deploy checks on Vercel

1. Open `/sign-in`, login.
2. Open `/jobs`:
   - should require auth
   - resume submit works
   - chat works
3. Open `/question/[id]` and test **Generate AI Answer** (Gemini route).
4. In Vercel dashboard > **Logs**, verify no `Missing GEMINI_API_KEY` errors.

---

## A6. Clerk production config

1. Open [Clerk Dashboard](https://dashboard.clerk.com/).
2. Select your app.
3. Go to **Domains**.
4. Add your Vercel domain.
5. Ensure sign-in/sign-up URLs are valid for production domain.

---

## A7. MongoDB Atlas production network

1. Atlas > Network Access.
2. Ensure Vercel can connect (if using `0.0.0.0/0`, already covered).
3. Confirm vector index is **Active** in production cluster/db.

---

## Part B — Docker setup (local reproducible container)

Use this to learn containerization and run app identically on any machine.

## B1. Install Docker Desktop (Windows)

1. Download: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Install and restart PC if asked.
3. Open Docker Desktop and wait until engine is running.

---

## B2. Create `Dockerfile` in project root

Create file `Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

---

## B3. Create `.dockerignore`

```txt
node_modules
.next
.git
.gitignore
*.log
.env*
STEPS
```

---

## B4. Build and run container

From project root:

```bash
docker build -t queueoverflow:latest .
docker run --name queueoverflow-app -p 3000:3000 --env-file .env.local queueoverflow:latest
```

Open: `http://localhost:3000`

Stop container:

```bash
docker stop queueoverflow-app
docker rm queueoverflow-app
```

---

## Part C — Kubernetes learning setup (optional)

Kubernetes is useful for scaling and orchestration. Vercel already handles this for frontend, but K8s is great to learn.

## C1. Prerequisites

- Docker image pushed to a registry (Docker Hub or GHCR)
- Local Kubernetes tool: Minikube or Docker Desktop Kubernetes

### Enable Kubernetes in Docker Desktop

1. Docker Desktop > Settings > Kubernetes
2. Check **Enable Kubernetes**
3. Apply & Restart

---

## C2. Push image to Docker Hub

1. Create account on [https://hub.docker.com/](https://hub.docker.com/)
2. Login locally:

```bash
docker login
```

3. Tag image:

```bash
docker tag queueoverflow:latest yourusername/queueoverflow:latest
```

4. Push:

```bash
docker push yourusername/queueoverflow:latest
```

---

## C3. Create Kubernetes secret for env vars

Create `k8s/secret.example.yaml` (do not commit real secrets):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: queueoverflow-secrets
type: Opaque
stringData:
  MONGODB_URL: "your_mongodb_url"
  GEMINI_API_KEY: "your_gemini_key"
  TAVILY_API_KEY: "your_tavily_key"
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_..."
  CLERK_SECRET_KEY: "sk_..."
  NEXT_PUBLIC_APP_URL: "http://localhost"
  NEXT_PUBLIC_SERVER_URL: "http://localhost"
```

Apply:

```bash
kubectl apply -f k8s/secret.example.yaml
```

---

## C4. Deployment manifest

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queueoverflow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: queueoverflow
  template:
    metadata:
      labels:
        app: queueoverflow
    spec:
      containers:
        - name: web
          image: yourusername/queueoverflow:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: queueoverflow-secrets
```

---

## C5. Service manifest

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: queueoverflow-service
spec:
  type: LoadBalancer
  selector:
    app: queueoverflow
  ports:
    - port: 80
      targetPort: 3000
```

Apply:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Check:

```bash
kubectl get pods
kubectl get services
```

---

## Part D — Recommended path for you right now

1. **Now:** Vercel + Atlas + Gemini + Tavily
2. **Next:** Docker for local reproducibility
3. **Later:** Kubernetes as portfolio learning

This gives you production quickly while still learning modern DevOps tools.
