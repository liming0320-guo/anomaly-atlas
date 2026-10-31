param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "dist")
)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$indexPath = Join-Path $root "index.html"
$outputPath = Join-Path $OutputDirectory "anomaly-atlas-ipad.html"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$html = [IO.File]::ReadAllText($indexPath, [Text.Encoding]::UTF8)
$css = [IO.File]::ReadAllText((Join-Path $root "assets\styles.css"), [Text.Encoding]::UTF8)
$data = [IO.File]::ReadAllText((Join-Path $root "assets\data.js"), [Text.Encoding]::UTF8)
$app = [IO.File]::ReadAllText((Join-Path $root "assets\app.js"), [Text.Encoding]::UTF8)
$iconPath = Join-Path $root "icons\apple-touch-icon.png"

if (Test-Path $iconPath) {
  $iconBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($iconPath))
  $html = $html.Replace(
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
    '<link rel="apple-touch-icon" href="data:image/png;base64,' + $iconBase64 + '">'
  )
}

$html = $html.Replace('<link rel="manifest" href="manifest.webmanifest">', "<!-- Standalone iPad build: no manifest or service worker needed. -->")
$html = $html.Replace('<link rel="stylesheet" href="assets/styles.css">', "<style>`n$css`n</style>")
$html = $html.Replace('<script src="assets/data.js"></script>', "<script>`n$data`n</script>")
$html = $html.Replace('<script src="assets/app.js"></script>', "<script>`n$app`n</script>")

$utf8NoBom = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($outputPath, $html, $utf8NoBom)
Write-Host "iPad standalone build: $outputPath"
