$ErrorActionPreference = "Stop"

$source = "C:\Users\Bruker\Pictures\Logo"
$target = Join-Path $PSScriptRoot "public\logo"

$files = @(
    "fa-app-icon-180.png",
    "fa-app-icon-192.png",
    "fa-app-icon-512.png",
    "fa-app-icon-dark-180.png",
    "fa-app-icon-dark-192.png",
    "fa-app-icon-dark-512.png",
    "fa-header.png",
    "fa-header-dark.png"
)

Write-Host "Synkroniserer Feltassistent-branding..." -ForegroundColor Cyan

if (-not (Test-Path $source)) {
    throw "Kildemappen finnes ikke: $source"
}

New-Item -ItemType Directory -Force $target | Out-Null

foreach ($file in $files) {
    $sourceFile = Join-Path $source $file
    $targetFile = Join-Path $target $file

    if (-not (Test-Path $sourceFile)) {
        throw "Mangler originalfil: $sourceFile"
    }

    $length = (Get-Item $sourceFile).Length

    if ($length -lt 1000) {
        throw "Originalfilen virker ugyldig eller tom: $sourceFile ($length bytes)"
    }

    Copy-Item $sourceFile $targetFile -Force
    Write-Host "Kopiert: $file ($length bytes)"
}

$wrongImagesFolder = Join-Path $PSScriptRoot "public\images"

if (Test-Path $wrongImagesFolder) {
    Remove-Item $wrongImagesFolder -Recurse -Force
    Write-Host "Fjernet ubrukt mappe: public\images"
}

Get-ChildItem (Join-Path $PSScriptRoot "public\icons") `
    -Filter "fa-app-icon-dark-*.png" `
    -ErrorAction SilentlyContinue |
    Remove-Item -Force

Write-Host ""
Write-Host "Kontroll av filer i public\logo:" -ForegroundColor Cyan

Get-ChildItem $target |
    Where-Object { $_.Name -in $files } |
    Sort-Object Name |
    Select-Object Name, Length

Write-Host ""
Write-Host "Git-status:" -ForegroundColor Cyan
git status --short
