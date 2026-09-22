param(
    [Parameter(Mandatory = $true)]
    [string]$ImageTag
)

$ErrorActionPreference = "Stop"

$Namespace = "stockai-staging"
$Deployment = "stockai-backend"
$ManifestDir = Join-Path $PSScriptRoot "."

Write-Host "Starting StockAI staging deployment..."
Write-Host "Namespace: $Namespace"
Write-Host "Deployment: $Deployment"
Write-Host "Image tag: $ImageTag"

kubectl apply -f (Join-Path $ManifestDir "namespace.yaml")
kubectl apply -f (Join-Path $ManifestDir "deployment.yaml")
kubectl apply -f (Join-Path $ManifestDir "service.yaml")

kubectl -n $Namespace set image deployment/$Deployment `
    stockai-app="970547378393.dkr.ecr.us-east-1.amazonaws.com/stockai-backend:$ImageTag"

Write-Host "Waiting for zero-downtime rollout..."

kubectl -n $Namespace rollout status deployment/$Deployment --timeout=10m

if ($LASTEXITCODE -ne 0) {
    Write-Error "Staging deployment failed."
    kubectl -n $Namespace rollout status deployment/$Deployment
    exit 1
}

Write-Host "Staging deployment completed successfully."
