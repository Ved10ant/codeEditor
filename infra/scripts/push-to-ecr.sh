#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${AWS_REGION:?Set AWS_REGION in .env}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID in .env}"
: "${ECR_REPOSITORY:?Set ECR_REPOSITORY in .env}"

IMAGE_TAG="${IMAGE_TAG:-latest}"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo "==> Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "==> Building production image (Frontend)..."
docker build -t "${ECR_REPOSITORY}:${IMAGE_TAG}" -f Frontend/Dockerfile Frontend

echo "==> Tagging and pushing..."
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:${IMAGE_TAG}"

echo "Pushed: ${ECR_URI}:${IMAGE_TAG}"
