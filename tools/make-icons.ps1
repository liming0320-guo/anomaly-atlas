param(
  [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) "icons")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

function New-AtlasIcon {
  param(
    [int]$Size,
    [string]$Path
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#4c2b18"))

  $ringPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#d8ae69"), [Math]::Max(1, $Size / 180))
  $graphics.DrawEllipse($ringPen, $Size * 0.185, $Size * 0.185, $Size * 0.63, $Size * 0.63)

  $accent = [System.Drawing.ColorTranslator]::FromHtml("#f2a13e")
  $centerX = $Size / 2
  $centerY = $Size / 2
  $barWidth = [Math]::Max(4, $Size * 0.045)
  $roundPen = New-Object System.Drawing.Pen($accent, $barWidth)
  $roundPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $roundPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $graphics.DrawLine($roundPen, $centerX - $Size * 0.13, $centerY + $Size * 0.07, $centerX - $Size * 0.13, $centerY - $Size * 0.04)
  $graphics.DrawLine($roundPen, $centerX, $centerY + $Size * 0.15, $centerX, $centerY - $Size * 0.15)
  $graphics.DrawLine($roundPen, $centerX + $Size * 0.13, $centerY + $Size * 0.04, $centerX + $Size * 0.13, $centerY - $Size * 0.07)

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $roundPen.Dispose()
  $ringPen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-AtlasIcon -Size 180 -Path (Join-Path $OutputDirectory "apple-touch-icon.png")
New-AtlasIcon -Size 192 -Path (Join-Path $OutputDirectory "icon-192.png")
New-AtlasIcon -Size 512 -Path (Join-Path $OutputDirectory "icon-512.png")
Write-Host "Icons written to $OutputDirectory"
