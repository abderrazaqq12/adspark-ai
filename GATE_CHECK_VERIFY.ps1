[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
$VPS_IP = "72.62.26.4"
$URL = "https://$VPS_IP"

Write-Output "--- GATE 1: HEALTH CHECK ---"
try {
    $health = Invoke-RestMethod -Uri "$URL/api/health" -Method Get
    Write-Output "HEALTH RESPONSE:"
    $health | ConvertTo-Json
}
catch {
    Write-Output "HEALTH FAILED: $($_.Exception.Message)"
}

Write-Output "`n--- GATE 1: PROJECT CREATION ---"
try {
    $headers = @{ "x-user-id" = "170d6fb1-4e4f-4704-ab9a-a917dc86cba5" }
    $body = @{ name = "Gate Check Project" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$URL/api/projects" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Output "PROJECT CREATED: $($response.id)"
}
catch {
    Write-Output "PROJECT CREATION FAILED: $($_.Exception.Message)"
}
