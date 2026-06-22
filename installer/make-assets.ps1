# Genera los graficos de marca del instalador: icon.ico, wizard-large.bmp, wizard-small.bmp
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot 'assets'
New-Item -ItemType Directory -Force $assets | Out-Null

$pink   = [System.Drawing.ColorTranslator]::FromHtml('#ff2d7e')
$purple = [System.Drawing.ColorTranslator]::FromHtml('#b829e8')
$bg     = [System.Drawing.ColorTranslator]::FromHtml('#0e0e14')
$muted  = [System.Drawing.ColorTranslator]::FromHtml('#9aa0b0')

function New-RoundedPath($x,$y,$w,$h,$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw-Logo($g, $x, $y, $size) {
  $r = [int]($size * 0.24)
  $path = New-RoundedPath $x $y $size $size $r
  $rect = New-Object System.Drawing.Rectangle($x, $y, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $pink, $purple, 50.0)
  $g.FillPath($brush, $path)
  # triangulo play blanco (centrado)
  $cx = $x + $size * 0.52; $cy = $y + $size * 0.5; $t = $size * 0.2
  $pts = New-Object 'System.Drawing.PointF[]' 3
  $pts[0] = New-Object System.Drawing.PointF(($cx - $t*0.8), ($cy - $t))
  $pts[1] = New-Object System.Drawing.PointF(($cx - $t*0.8), ($cy + $t))
  $pts[2] = New-Object System.Drawing.PointF(($cx + $t),     $cy)
  $g.FillPolygon([System.Drawing.Brushes]::White, $pts)
  $brush.Dispose(); $path.Dispose()
}

# ---- 1) Icono (PNG 256 -> ICO) ----
$png = Join-Path $assets 'icon256.png'
$ico = Join-Path $assets 'icon.ico'
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::Transparent)
Draw-Logo $g 12 12 232
$g.Dispose()
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$bytes = [System.IO.File]::ReadAllBytes($png)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
$bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
$bw.Write([UInt16]1); $bw.Write([UInt16]32)
$bw.Write([UInt32]$bytes.Length); $bw.Write([UInt32]22)
$bw.Write($bytes); $bw.Flush()
[System.IO.File]::WriteAllBytes($ico, $ms.ToArray())
$bw.Dispose(); $ms.Dispose()

# ---- 2) Imagen grande del asistente (164 x 314) ----
$big = New-Object System.Drawing.Bitmap(164, 314)
$g = [System.Drawing.Graphics]::FromImage($big)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear($bg)
Draw-Logo $g 52 70 60
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$fontTitle = New-Object System.Drawing.Font('Segoe UI', 20, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font('Segoe UI', 9)
$g.DrawString('TikLike', $fontTitle, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 150, 164, 30)), $sf)
$mb = New-Object System.Drawing.SolidBrush($muted)
$g.DrawString('TikTok + Twitch' + [char]10 + 'para OBS', $fontSub, $mb, (New-Object System.Drawing.RectangleF(0, 185, 164, 40)), $sf)
$g.Dispose()
$big.Save((Join-Path $assets 'wizard-large.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
$big.Dispose()

# ---- 3) Imagen pequena del asistente (55 x 55) ----
$small = New-Object System.Drawing.Bitmap(55, 55)
$g = [System.Drawing.Graphics]::FromImage($small)
$g.SmoothingMode = 'AntiAlias'
$g.Clear($bg)
Draw-Logo $g 6 6 43
$g.Dispose()
$small.Save((Join-Path $assets 'wizard-small.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
$small.Dispose()

Write-Host "Assets generados en: $assets"
Get-ChildItem $assets | Select-Object Name, Length
