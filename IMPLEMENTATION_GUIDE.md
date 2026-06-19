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
Automate build → test → Docker build → push to ECR on each commit.

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

#### Stage 4: Docker Build (Main Branch Only)
```
if: github.ref == 'refs/heads/main'
├─ Configure AWS credentials
├─ Login to ECR
├─ Build Docker image for Frontend
├─ Tag: :latest and :${{ github.sha }}
├─ Push Frontend image to ECR
├─ Build Docker image for Backend
├─ Push Backend image to ECR
└─ Output: Image URIs
```

### Environment Variables Needed
```yaml
env:
  AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
  AWS_REGION: us-east-1
  ECR_REPOSITORY_FRONTEND: collaborative-editor-frontend
  ECR_REPOSITORY_BACKEND: collaborative-editor-backend
```

### GitHub Secrets to Configure
```
Settings → Secrets and variables → Actions
├─ AWS_ACCOUNT_ID: your-12-digit-aws-account-id
├─ AWS_ACCESS_KEY_ID: IAM user access key
└─ AWS_SECRET_ACCESS_KEY: IAM user secret key
```

### IAM Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:CreateRepository"
      ],
      "Resource": "arn:aws:ecr:*:AWS_ACCOUNT_ID:repository/*"
    },
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    }
  ]
}
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
      # ... docker build & push to ECR
```

### Testing Checklist
- [ ] Push code to GitHub → GitHub Actions triggered
- [ ] Frontend builds successfully
- [ ] Backend dependencies resolve
- [ ] Docker image builds
- [ ] Image pushed to ECR with correct tag
- [ ] View ECR console → image present with correct digest

---

## ☁️ Priority 4: AWS ECS Deployment

### Goal
Deploy containerized Frontend and Backend to AWS ECS (Fargate).

### Architecture
```
GitHub Actions
    ↓ (push images)
AWS ECR (image registry)
    ↓ (pull images)
AWS ECS Cluster (Fargate)
├─ Frontend Service (port 80 → 5173 or 80)
├─ Backend Service (port 4000)
└─ Load Balancer (ALB)
    ↓
Internet
```

### Prerequisites
1. AWS Account
2. AWS CLI configured: `aws configure`
3. ECR repositories created
4. ECS cluster created
5. Load Balancer (ALB) created
6. VPC & security groups configured

### Step 1: Create ECR Repositories

```bash
# Frontend
aws ecr create-repository \
  --repository-name collaborative-editor-frontend \
  --region us-east-1

# Backend
aws ecr create-repository \
  --repository-name collaborative-editor-backend \
  --region us-east-1
```

### Step 2: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name collaborative-editor-cluster \
  --region us-east-1
```

### Step 3: Create IAM Roles for ECS

**ecsTaskExecutionRole** (allows ECS to pull images from ECR)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 4: Create Task Definitions

#### Backend Task Definition
```json
{
  "family": "collaborative-editor-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/collaborative-editor-backend:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "hostPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "4000"
        },
        {
          "name": "MONGODB_URI",
          "value": "mongodb+srv://user:pass@cluster.mongodb.net/db"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/collaborative-editor-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole"
}
```

#### Frontend Task Definition
```json
{
  "family": "collaborative-editor-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/collaborative-editor-frontend:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "hostPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "VITE_API_URL",
          "value": "https://api.yourdomain.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/collaborative-editor-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole"
}
```

### Step 5: Register Task Definitions

```bash
# Backend
aws ecs register-task-definition \
  --cli-input-json file://backend-task-definition.json

# Frontend
aws ecs register-task-definition \
  --cli-input-json file://frontend-task-definition.json
```

### Step 6: Create ECS Services

```bash
# Backend Service
aws ecs create-service \
  --cluster collaborative-editor-cluster \
  --service-name collaborative-editor-backend \
  --task-definition collaborative-editor-backend:1 \
  --desired-count 1 \ # 🚨 Keep at 1 to maintain Yjs/Socket state. Requires Redis if > 1
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=4000"

# Frontend Service
aws ecs create-service \
  --cluster collaborative-editor-cluster \
  --service-name collaborative-editor-frontend \
  --task-definition collaborative-editor-frontend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=frontend,containerPort=80"
```

### Step 7: Configure Load Balancer (ALB)

1. **Create Application Load Balancer**
   - Listen on port 80 (HTTP) and 443 (HTTPS)
   - Two target groups:
     - Frontend: port 80
     - Backend: port 4000 (🚨 **CRITICAL:** You must enable "Sticky Sessions" / "Target Group Stickiness" on this group for Socket.io to work)

2. **Routing Rules**
   ```
   /socket.io/* → Backend Service
   /api/* → Backend Service
   /* → Frontend Service
   ```

### Step 8: Setup Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/collaborative-editor-cluster/collaborative-editor-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy (scale up if CPU > 70%)
aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --resource-id service/collaborative-editor-cluster/collaborative-editor-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration "TargetValue=70.0,PredefinedMetricSpecification={PredefinedMetricType=ECSServiceAverageCPUUtilization}"
```

### Step 9: Setup Monitoring & Logging

1. **CloudWatch Logs**
   - Logs automatically go to `/ecs/collaborative-editor-*`
   - View in CloudWatch console

2. **CloudWatch Alarms**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name backend-cpu-high \
     --alarm-description "Alert if backend CPU > 80%" \
     --metric-name CPUUtilization \
     --namespace AWS/ECS \
     --statistic Average \
     --period 300 \
     --threshold 80 \
     --comparison-operator GreaterThanThreshold
   ```

### Step 10: Update GitHub Actions to Deploy

Add to CI/CD pipeline after Docker push:
```yaml
- name: Update ECS Service
  run: |
    aws ecs update-service \
      --cluster collaborative-editor-cluster \
      --service collaborative-editor-backend \
      --force-new-deployment
```

### Testing Checklist
- [ ] ECR repositories created and images present
- [ ] ECS cluster running
- [ ] Backend task running in ECS (check ECS console)
- [ ] Frontend task running in ECS
- [ ] Load Balancer healthy status (targets passing health checks)
- [ ] Access frontend via ALB domain name
- [ ] Frontend can communicate with backend
- [ ] Auto-scaling works (watch task count increase under load)

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

Week 3: GitHub Actions
  ├─ Create CI pipeline
  ├─ Setup AWS credentials as secrets
  ├─ Test: push code → auto build & push to ECR
  └─ Verify images in ECR

Week 4: ECS Deployment
  ├─ AWS setup: cluster, roles, task definitions
  ├─ Create services + ALB
  ├─ Setup auto-scaling & monitoring
  └─ Deploy and test
```

---

## 🔑 Key Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
CORS_ORIGIN=https://yourdomain.com
```

### Frontend (.env)
```
VITE_API_URL=https://api.yourdomain.com
```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS errors | Update CORS_ORIGIN in backend .env |
| MongoDB connection timeout | Whitelist IP in MongoDB Atlas or use local MongoDB |
| ECS tasks failing to start | Check CloudWatch logs, verify image exists in ECR |
| Frontend can't reach backend | Verify ALB routing rules, security groups open ports |
| Auto-scaling not working | Check IAM permissions, scaling policy thresholds |

---

## 📚 Useful Commands

```bash
# View ECS tasks
aws ecs list-tasks --cluster collaborative-editor-cluster

# View task details
aws ecs describe-tasks --cluster collaborative-editor-cluster --tasks <task-arn>

# View service details
aws ecs describe-services --cluster collaborative-editor-cluster --services collaborative-editor-backend

# View ECR images
aws ecr describe-images --repository-name collaborative-editor-backend

# Tail logs
aws logs tail /ecs/collaborative-editor-backend --follow

# Update image in service
aws ecs update-service --cluster collaborative-editor-cluster --service collaborative-editor-backend --force-new-deployment
```

---

## ✅ Success Criteria

- [ ] Room system works: create/join rooms with isolation
- [ ] Documents persist in MongoDB across restarts
- [ ] GitHub Actions auto-builds and pushes images on commit
- [ ] ECS services running with healthy target groups
- [ ] Frontend accessible via ALB
- [ ] Multiple users can collaborate in real-time
- [ ] Auto-scaling responds to load

