# Implementation Guide: 4 Major Priorities

---

## 📋 Priority 1: Room Management System

### Goal
Replace single global document with isolated rooms. Users can create/join rooms with unique codes.

### Architecture
```
User1 Room ABC123 ←→ Yjs Doc ABC123 ←→ Socket.io namespace: room:ABC123
User2 Room ABC123 ↓  (same document)
User3 Room XYZ789 ←→ Yjs Doc XYZ789 ←→ Socket.io namespace: room:XYZ789
```

### Backend Changes (server.js)

1. **Add room management structure**
   ```javascript
   const rooms = new Map(); // roomId → { name, createdAt, activeUsers: Set }
   ```

2. **Add REST API endpoints**
   ```
   POST   /api/rooms          → Create new room, return roomId
   GET    /api/rooms/:roomId  → Get room info, verify room exists
   GET    /api/rooms          → List all active rooms
   ```

3. **Update Socket.io connection handling**
   - Add `join-room` event listener
   - Use Socket.io rooms: `socket.join(`room:${roomId}`)`
   - Emit `user-joined` and `user-left` events to specific rooms
   - Track active users per room

4. **Room ID generation**
   - Use `crypto.randomBytes(6).toString("hex").toUpperCase()`
   - Creates 12-char codes like: `A1B2C3D4E5F6`

5. **Update Yjs namespace**
   - Change from `"monaco-room"` to `room:${roomId}`
   - Each room gets isolated Y.Doc

### Frontend Changes

1. **Create RoomPage.tsx** (new file)
   - Two tabs: "Create Room" and "Join Room"
   - Create room: POST to `/api/rooms`, get roomId
   - Join room: Validate room code exists via GET `/api/rooms/:roomId`
   - Save username to localStorage
   - Navigate to `/editor/:roomId`

2. **Update EditorPage.tsx**
   - Get roomId from URL params: `useParams<{ roomId: string }>()`
   - Connect provider to `room:${roomId}` namespace
   - Emit `join-room` event with roomId and username
   - Listen for `user-joined` and `user-left` events
   - Display active user count
   - Show room code with copy button

3. **Update App.tsx** - Add React Router
   ```
   / → RoomPage
   /editor/:roomId → EditorPage
   ```

4. **Add react-router-dom to package.json**
   ```
   npm install react-router-dom
   ```

### Testing Checklist
- [ ] Backend creates room with unique 12-char code
- [ ] Frontend can create room and navigate to editor
- [ ] Frontend can join room with valid code
- [ ] Multiple users in same room see shared document
- [ ] Different rooms have isolated documents
- [ ] User count updates when users join/leave
- [ ] Room info displayed (name, code, active users)

---

## 💾 Priority 2: Document Persistence (MongoDB)

### Goal
Save documents to MongoDB so they survive server restarts.

### Architecture
```
Client → Socket.io → Backend → MongoDB
                      ↓
                  Save on changes
```

### Prerequisites
- MongoDB instance (local, Atlas, or Docker)
- Add `mongoose` package

### Implementation Steps

1. **Install Dependencies**
   ```bash
   npm install mongoose
   ```

2. **Create MongoDB Schema** (models/Document.ts or .js)
   ```javascript
   Schema: {
     roomId: String (unique index),
     content: String,
     lastModified: Date,
     createdAt: Date
   }
   ```

3. **Backend Integration**
   - Connect to MongoDB on server startup
   - On socket connection to room, load document from DB
   - Save document on intervals (debounce every 5 seconds)
   - OR save on `update` event from Yjs
   - Handle Yjs update encoding: convert to binary or JSON

4. **Load Document on Join**
   - When user joins room, check if document exists in DB
   - If exists: send to client via Yjs state update
   - If not: initialize empty document

5. **Error Handling**
   - Reconnection logic if DB fails
   - Graceful degradation (work offline, sync when back)

### Yjs Persistence Pattern
```javascript
// Save Yjs state to MongoDB
const state = Y.encodeStateAsUpdate(ydoc);
// Or use JSON serialization if preferred

// Load from DB on startup
const loadedState = await Document.findOne({ roomId });
Y.applyUpdate(ydoc, loadedState.content);
```

### Environment Variables
```
MONGODB_URI=mongodb://localhost:27017/collaborative-editor
```

### Testing Checklist
- [ ] Start backend, create room, type code
- [ ] Restart backend
- [ ] Rejoin same room, document content still there
- [ ] Multiple rooms have separate documents in DB
- [ ] Documents update every 5 seconds while editing

---

## 🚀 Priority 3: GitHub Actions CI Pipeline

### Goal
Automate build → test → Docker build → push to Docker Hub on each commit.

### File to Create
`.github/workflows/ci-cd.yml`

### Pipeline Stages

#### Stage 1: Code Quality
```
Event: push to main/dev branch
├─ Checkout code
├─ Node setup (v22)
├─ Install dependencies
├─ Run linter (if configured)
└─ Run tests (if configured)
```

#### Stage 2: Build Frontend
```
├─ Install Frontend dependencies
├─ Run npm run build
├─ Upload dist/ as artifact
└─ Check for build errors
```

#### Stage 3: Build Backend
```
├─ Install Backend dependencies
├─ Check for syntax errors
└─ Verify dependencies resolve
```

#### Stage 4: Docker Build & Push (Main Branch Only)
```
if: github.ref == 'refs/heads/main'
├─ Login to Docker Hub
├─ Build Docker image for Frontend
├─ Tag: :latest and :${{ github.sha }}
├─ Push Frontend image to Docker Hub
├─ Build Docker image for Backend
├─ Push Backend image to Docker Hub
└─ Output: Image Tags
```

### Environment Variables Needed
```yaml
env:
  DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
```

### GitHub Secrets to Configure
```
Settings → Secrets and variables → Actions
├─ DOCKERHUB_USERNAME: your-dockerhub-username
└─ DOCKERHUB_TOKEN: your-dockerhub-access-token
```

### GitHub Actions YAML Structure
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      # ... code checkout, install, test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      # ... build frontend & backend

  docker:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # ... docker build & push to Docker Hub
```

### Testing Checklist
- [ ] Push code to GitHub → GitHub Actions triggered
- [ ] Frontend builds successfully
- [ ] Backend dependencies resolve
- [ ] Docker image builds
- [ ] Image pushed to Docker Hub with correct tag
- [ ] View Docker Hub repository → image present with correct tag

---

## 🐳 Priority 4: Docker Build Validation

### Goal
Validate that the built Docker images run correctly. Instead of deploying to AWS, we will pull the built images from Docker Hub and run them locally using Docker Compose to ensure the multi-container application works as expected.

### Architecture
```
GitHub Actions
    ↓ (push images)
Docker Hub (image registry)
    ↓ (pull images)
Local Environment
├─ Frontend Container (port 80)
├─ Backend Container (port 4000)
```

### Prerequisites
1. Docker Desktop installed locally
2. Docker Hub account
3. Docker Compose file ready

### Step 1: Create docker-compose.yml

Create a `docker-compose.prod.yml` to pull the latest images from Docker Hub and run them.

```yaml
version: '3.8'
services:
  frontend:
    image: your-dockerhub-username/collaborative-editor-frontend:latest
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://localhost:4000
    depends_on:
      - backend

  backend:
    image: your-dockerhub-username/collaborative-editor-backend:latest
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - MONGODB_URI=${MONGODB_URI}
      - CORS_ORIGIN=http://localhost
```

### Step 2: Validate Deployment Locally

1. Create a `.env` file with your `MONGODB_URI`.
2. Run the environment using Docker Compose:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 3: CI/CD Pipeline Integration

You can add a validation step in your GitHub Actions pipeline to ensure the built images can successfully start up using Docker.

```yaml
  validate:
    needs: docker
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run Docker Build Validation
        run: |
          # Start containers
          docker-compose -f docker-compose.prod.yml up -d
          
          # Wait for services to be ready
          sleep 10
          
          # Check if containers are running
          docker ps
          
          # Check health of the backend
          curl -f http://localhost:4000/api/health || exit 1
          
          # Tear down
          docker-compose -f docker-compose.prod.yml down
```

### Testing Checklist
- [ ] `docker-compose.prod.yml` is configured to pull images from Docker Hub.
- [ ] Running `docker-compose up` locally successfully pulls and starts the containers.
- [ ] Backend is reachable on port 4000.
- [ ] Frontend is reachable on port 80.
- [ ] GitHub Actions pipeline successfully runs the validation step.

---

## 📊 Implementation Timeline

```
Week 1: Room Management
  ├─ Backend: room API + socket handlers
  ├─ Frontend: RoomPage + routing
  └─ Testing locally

Week 2: MongoDB Persistence
  ├─ Setup MongoDB (local or Atlas)
  ├─ Backend: add Mongoose + save/load logic
  └─ Testing data persistence

Week 3: GitHub Actions CI Pipeline
  ├─ Create CI pipeline
  ├─ Setup Docker Hub credentials as secrets
  ├─ Test: push code → auto build & push to Docker Hub
  └─ Verify images in Docker Hub

Week 4: Docker Build Validation
  ├─ Create docker-compose.prod.yml
  ├─ Test pulling and running images locally
  ├─ Add validation step to CI pipeline
  └─ Complete end-to-end testing
```

---

## 🔑 Key Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
CORS_ORIGIN=http://localhost
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:4000
```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS errors | Update CORS_ORIGIN in backend .env |
| MongoDB connection timeout | Whitelist IP in MongoDB Atlas or use local MongoDB |
| Containers failing to start | Check docker logs, verify environment variables |
| Images fail to push to Docker Hub | Check GitHub Secrets for DOCKERHUB_USERNAME and TOKEN |
| Docker Hub rate limits | Authenticate docker pull requests using your token |

---

## 📚 Useful Commands

```bash
# Build images locally
docker-compose build

# Run images from Docker Hub
docker-compose -f docker-compose.prod.yml up -d

# View container logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop and remove containers
docker-compose -f docker-compose.prod.yml down

# Push images manually
docker push username/repo:tag
```

---

## ✅ Success Criteria

- [ ] Room system works: create/join rooms with isolation
- [ ] Documents persist in MongoDB across restarts
- [ ] GitHub Actions auto-builds and pushes images to Docker Hub on commit
- [ ] Docker Compose can run the production images locally
- [ ] GitHub Actions validation step successfully runs the containers
- [ ] Multiple users can collaborate in real-time


