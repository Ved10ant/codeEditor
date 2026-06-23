# 🚀 Collaborative Code Editor

A scalable, real-time collaborative code editor built with React, Monaco Editor, Yjs, Socket.io, Node.js, and MongoDB. The application is completely containerized and features a fully automated CI/CD pipeline.

> [!NOTE]  
> **Current Deployment Strategy**: The project currently uses **Docker Hub** for container registry management and **GitHub Actions** for CI/CD automation.  
> **Future Roadmap**: The long-term architectural goal is to deploy the infrastructure to **AWS (ECS / ECR)** for scalable production hosting.

---

## 📌 Project Status

✅ Completed Main Priorities
🚀 Automated CI Pipeline functional
🛠 Ongoing Architectural Enhancements (AWS planned)

---

## ✨ Features

- **Real-time Collaboration**: Code synchronization in milliseconds across multiple users using Yjs CRDTs.
- **Isolated Rooms**: Users can create or join specific coding sessions using auto-generated unique 12-character room codes.
- **Persistent Documents**: Code state is automatically backed up to a MongoDB database (debounced saves) allowing sessions to survive server restarts.
- **Presence Indicators**: See when users join or leave the active room.
- **Professional Editor**: Fully integrated Monaco Editor (the core of VS Code) providing syntax highlighting and developer ergonomics.
- **Complete Containerization**: Multi-stage Docker builds for the Frontend and a customized Node image for the Backend, orchestrated with Docker Compose.
- **Automated CI/CD**: GitHub Actions pipeline that automatically tests container builds, health-checks endpoints, and pushes production-ready images to Docker Hub on every commit.

---

## 🧠 Tech Stack

### Frontend
- **React 18** (TypeScript)
- **Vite** (Build Tool)
- **Monaco Editor**
- **Yjs** & **y-monaco**
- **React Router**

### Backend
- **Node.js 22** & **Express.js**
- **Socket.io** (WebSockets)
- **MongoDB** & **Mongoose** (Document Persistence)
- **y-socket.io**

### DevOps / Infrastructure
- **Docker** & **Docker Compose**
- **GitHub Actions** (CI/CD Pipeline)
- **Docker Hub** (Container Registry)
- *AWS ECS & ECR (Planned for Future Releases)*

---

## 🚀 How to Run Locally

You can run the entire stack locally using Docker Compose without needing to manually install Node.js or MongoDB.

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ved10ant/codeEditor.git
   cd codeEditor
   ```

2. **Run the Development Environment**  
   This runs the Vite dev server for the frontend, Nodemon for the backend, and spins up a MongoDB container.
   ```bash
   docker compose --profile dev up -d --build
   ```
   - Frontend available at: `http://localhost:5173`
   - Backend API available at: `http://localhost:4000`

3. **Run the Production Environment**  
   This serves the frontend via NGINX and runs the backend in production mode.
   ```bash
   docker compose --profile prod up -d --build
   ```
   - Frontend available at: `http://localhost:8080`
   - Backend API available at: `http://localhost:4000`

4. **Tear down the environment**
   ```bash
   docker compose --profile dev down
   # or
   docker compose --profile prod down
   ```

---

## 📂 Project Structure

```bash
dockerAwsproject/
│
├── Frontend/               # React Vite Application
│   ├── Dockerfile          # Multi-stage production build (NGINX)
│   └── Dockerfile.dev      # Local development container
│
├── Backend/                # Node.js + Express API
│   ├── models/             # Mongoose Schemas (Document.js)
│   ├── functions/          # Utility scripts (ID generation)
│   ├── server.js           # Socket.io & API endpoints
│   └── Dockerfile          # Production Node container
│
├── .github/workflows/      # GitHub Actions
│   └── ci.yml              # Build, Test, Push, and Validate pipeline
│
├── docker-compose.yml      # Container Orchestration (Dev/Prod Profiles)
└── IMPLEMENTATION_GUIDE.md # Internal task tracking and architecture notes
```
