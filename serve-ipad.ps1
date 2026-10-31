param(
  [int]$Port = 8080,
  [string]$Root = $PSScriptRoot
)

$ErrorActionPreference = "Stop"
$rootFull = [IO.Path]::GetFullPath($Root)
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Any, $Port)

$contentTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".md"   = "text/markdown; charset=utf-8"
}

function Send-Response {
  param(
    [Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$IncludeBody
  )

  $reason = @{
    200 = "OK"
    400 = "Bad Request"
    403 = "Forbidden"
    404 = "Not Found"
    405 = "Method Not Allowed"
    500 = "Internal Server Error"
  }[$Status]
  $headers = "HTTP/1.1 $Status $reason`r`n" +
             "Content-Type: $ContentType`r`n" +
             "Content-Length: $($Body.Length)`r`n" +
             "Cache-Control: no-store`r`n" +
             "Connection: close`r`n`r`n"
  $headerBytes = [Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($IncludeBody -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

try {
  $listener.Start()
} catch {
  Write-Host ""
  Write-Host "无法在端口 $Port 启动服务：$($_.Exception.Message)" -ForegroundColor Red
  Write-Host "请换一个端口，例如：.\serve-ipad.ps1 -Port 8090"
  exit 1
}

$ipconfigText = (& ipconfig 2>$null) -join "`n"
$addresses = [regex]::Matches($ipconfigText, "IPv4[^:]*:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})") |
  ForEach-Object { $_.Groups[1].Value } |
  Where-Object { $_ -ne "127.0.0.1" } |
  Select-Object -Unique
if (-not $addresses) {
  $addresses = [Net.Dns]::GetHostAddresses([Net.Dns]::GetHostName()) |
    Where-Object {
      $_.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork -and
      -not [Net.IPAddress]::IsLoopback($_)
    } |
    Select-Object -ExpandProperty IPAddressToString -Unique
}

Write-Host ""
Write-Host "异常检测研究图谱 · iPad 局域网服务已启动" -ForegroundColor Green
Write-Host "电脑访问：http://localhost:$Port"
foreach ($address in $addresses) {
  Write-Host "iPad 访问：http://${address}:$Port" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "请确保 iPad 与这台电脑连接同一个 Wi-Fi。首次启动若出现 Windows 防火墙提示，请允许“专用网络”。"
Write-Host "保持此窗口开启。按 Ctrl+C 停止服务。"
Write-Host ""

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
      do {
        $headerLine = $reader.ReadLine()
      } while (-not [string]::IsNullOrEmpty($headerLine))

      $parts = $requestLine.Split(" ")
      if ($parts.Length -lt 2) {
        $bytes = [Text.Encoding]::UTF8.GetBytes("Bad Request")
        Send-Response -Stream $stream -Status 400 -ContentType "text/plain; charset=utf-8" -Body $bytes -IncludeBody $true
        continue
      }

      $method = $parts[0].ToUpperInvariant()
      $includeBody = $method -eq "GET"
      if ($method -ne "GET" -and $method -ne "HEAD") {
        $bytes = [Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
        Send-Response -Stream $stream -Status 405 -ContentType "text/plain; charset=utf-8" -Body $bytes -IncludeBody $true
        continue
      }

      $target = $parts[1].Split("?")[0]
      $target = [Uri]::UnescapeDataString($target)
      if ($target -eq "/") { $target = "/index.html" }
      $relative = $target.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
      $fullPath = [IO.Path]::GetFullPath((Join-Path $rootFull $relative))
      $rootPrefix = $rootFull.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

      if (-not $fullPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        $bytes = [Text.Encoding]::UTF8.GetBytes("Not Found")
        Send-Response -Stream $stream -Status 404 -ContentType "text/plain; charset=utf-8" -Body $bytes -IncludeBody $includeBody
        continue
      }

      $extension = [IO.Path]::GetExtension($fullPath).ToLowerInvariant()
      $contentType = if ($contentTypes.ContainsKey($extension)) { $contentTypes[$extension] } else { "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($fullPath)
      Send-Response -Stream $stream -Status 200 -ContentType $contentType -Body $bytes -IncludeBody $includeBody
    } catch {
      try {
        if ($stream) {
          $bytes = [Text.Encoding]::UTF8.GetBytes("Server Error")
          Send-Response -Stream $stream -Status 500 -ContentType "text/plain; charset=utf-8" -Body $bytes -IncludeBody $true
        }
      } catch {}
    } finally {
      if ($reader) { $reader.Dispose() }
      if ($stream) { $stream.Dispose() }
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
}
