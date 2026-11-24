# Test all APIs with proper auth
$loginResp = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}'
$token = $loginResp.data.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== 1. Images List ===" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/images' -Headers $headers
    Write-Host ("Code: $($r.code) | Total: $($r.totalElements)")
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 2. OSS Upload Signature ===" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/oss/upload-signature' -Headers $headers
    Write-Host ("Code: $($r.code) | Host: $($r.data.host) | Dir: $($r.data.dir)")
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    # Try to get response body
    try {
        $err = $_.Exception.Response
        if ($err) {
            $stream = $err.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host $reader.ReadToEnd()
        }
    } catch {}
}

Write-Host ""
Write-Host "=== 3. Tags List ===" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/images/tags' -Headers $headers
    Write-Host ("Code: $($r.code) | Tags count: $($r.data.Count)")
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 4. Create Image (mock) ===" -ForegroundColor Cyan
try {
    $body = @{
        objectKey = "images/test/test.jpg"
        width = 1920
        height = 1080
        fileSize = 102400
        format = "jpg"
        title = "测试图片"
        description = "这是测试描述"
        tags = @("test", "demo")
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/images' -Method POST -ContentType 'application/json' -Headers $headers -Body $body
    Write-Host ("Code: $($r.code) | Created image ID: $($r.data.id)")
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
