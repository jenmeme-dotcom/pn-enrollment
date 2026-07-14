param(
    [int]$Port = 5500,
    [string]$Root = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

Set-Location $Root

$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Could not start server on $prefix. Try a different port." -ForegroundColor Red
    exit 1
}

Write-Host "Serving files from: $Root" -ForegroundColor Green
Write-Host "Open this URL: $prefix" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow

Start-Process "$prefix" | Out-Null

function Get-ContentType([string]$path) {
    switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".svg"  { return "image/svg+xml" }
        ".webp" { return "image/webp" }
        ".mp4"  { return "video/mp4" }
        ".ico"  { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }

    $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
    }

    $resolvedPath = Join-Path $Root $requestPath
    if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
        $context.Response.StatusCode = 404
        $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $context.Response.ContentType = "text/plain; charset=utf-8"
        $context.Response.ContentLength64 = $notFound.Length
        $context.Response.OutputStream.Write($notFound, 0, $notFound.Length)
        $context.Response.OutputStream.Close()
        continue
    }

    try {
        $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
        $context.Response.StatusCode = 200
        $context.Response.ContentType = Get-ContentType $resolvedPath
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
        $context.Response.StatusCode = 500
    } finally {
        $context.Response.OutputStream.Close()
    }
}

if ($listener.IsListening) {
    $listener.Stop()
}

