param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "dist")
)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$dist = [IO.Path]::GetFullPath($OutputDirectory)
$web = Join-Path $dist "web"
$zip = Join-Path $dist "anomaly-atlas-web.zip"
$allowedPrefix = $root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if (-not $dist.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Output directory must stay inside the project."
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Test-Path -LiteralPath $web) { Remove-Item -LiteralPath $web -Recurse -Force }
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
New-Item -ItemType Directory -Force -Path $web | Out-Null

Copy-Item -LiteralPath (Join-Path $root "index.html") -Destination $web
Copy-Item -LiteralPath (Join-Path $root "manifest.webmanifest") -Destination $web
Copy-Item -LiteralPath (Join-Path $root "sw.js") -Destination $web
Copy-Item -LiteralPath (Join-Path $root "_headers") -Destination $web
Copy-Item -LiteralPath (Join-Path $root "assets") -Destination $web -Recurse
Copy-Item -LiteralPath (Join-Path $root "icons") -Destination $web -Recurse

$utf8NoBom = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $web ".nojekyll"), "", $utf8NoBom)

Compress-Archive -Path (Join-Path $web "*") -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Static web folder: $web"
Write-Host "Upload-ready ZIP: $zip"
