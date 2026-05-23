# PowerShell equivalent of push-to-ecr.sh (Windows)
$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RootDir

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim()
        }
    }
}

$required = @("AWS_REGION", "AWS_ACCOUNT_ID", "ECR_REPOSITORY")
foreach ($name in $required) {
    if (-not (Get-Item "env:$name" -ErrorAction SilentlyContinue)) {
        throw "Set $name in .env (copy from .env.example)"
    }
}

$ImageTag = if ($env:IMAGE_TAG) { $env:IMAGE_TAG } else { "latest" }
$EcrUri = "$($env:AWS_ACCOUNT_ID).dkr.ecr.$($env:AWS_REGION).amazonaws.com/$($env:ECR_REPOSITORY)"

Write-Host "==> Logging in to ECR..."
$password = aws ecr get-login-password --region $env:AWS_REGION
$password | docker login --username AWS --password-stdin "$($env:AWS_ACCOUNT_ID).dkr.ecr.$($env:AWS_REGION).amazonaws.com"

Write-Host "==> Building production image (Frontend)..."
docker build -t "$($env:ECR_REPOSITORY):$ImageTag" -f Frontend/Dockerfile Frontend

Write-Host "==> Tagging and pushing..."
docker tag "$($env:ECR_REPOSITORY):$ImageTag" "${EcrUri}:$ImageTag"
docker push "${EcrUri}:$ImageTag"

Write-Host "Pushed: ${EcrUri}:$ImageTag"
