# Recreate the hand-drawn vector app mark as PNGs on Windows; no external assets.
Add-Type -AssemblyName System.Drawing
$myrunAssetRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\assets'))
function Write-MyRunMark([string]$FileName, [int]$Size) {
    $myrunBitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $myrunGraphics = [System.Drawing.Graphics]::FromImage($myrunBitmap)
    $myrunPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#C5F76B'), (76.0 * $Size / 1024))
    try {
        $myrunGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $myrunGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0B1210'))
        $myrunPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $myrunPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $myrunPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
        $myrunVertices = @(@(180,550), @(335,550), @(440,320), @(565,735), @(690,465), @(844,465))
        $myrunPoints = [System.Drawing.PointF[]]($myrunVertices | ForEach-Object { New-Object System.Drawing.PointF(($_[0] * $Size / 1024.0), ($_[1] * $Size / 1024.0)) })
        $myrunGraphics.DrawLines($myrunPen, $myrunPoints)
        $myrunBitmap.Save((Join-Path $myrunAssetRoot $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $myrunPen.Dispose()
        $myrunGraphics.Dispose()
        $myrunBitmap.Dispose()
    }
}
Write-MyRunMark 'icon.png' 1024
Write-MyRunMark 'splash-icon.png' 512
