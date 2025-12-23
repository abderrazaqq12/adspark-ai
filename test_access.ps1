[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
try {
    Invoke-RestMethod -Uri "https://72.62.26.4/api/health" -Method Get
    Write-Output "ACCESS_GRANTED"
}
catch {
    Write-Output "ACCESS_DENIED: $($_.Exception.Message)"
}
