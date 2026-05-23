# AWS deployment guide

Deploy the containerized **Frontend** (static React build behind nginx) to AWS.

## Recommended architecture

```
Developer → Docker build (Frontend/) → Amazon ECR → Amazon ECS (Fargate) → ALB
```

Run the **Backend** as a separate ECS service or container when you deploy collaboration features.

## Prerequisites

1. [AWS CLI](https://aws.amazon.com/cli/) configured
2. [Docker](https://www.docker.com/) running locally
3. ECR repository and ECS cluster in your account

## Quick deploy

1. Copy `.env.example` to `.env` and set `AWS_ACCOUNT_ID`, `ECR_REPOSITORY`, etc.
2. Push the frontend image:

   ```powershell
   .\infra\scripts\push-to-ecr.ps1
   ```

   ```bash
   ./infra/scripts/push-to-ecr.sh
   ```

3. Update your ECS service to use the new image tag.

## Files

| File | Purpose |
|------|---------|
| `scripts/push-to-ecr.ps1` / `.sh` | Build `Frontend/Dockerfile` and push to ECR |
| `ecs-task-definition.example.json` | Sample Fargate task (port 80) |
