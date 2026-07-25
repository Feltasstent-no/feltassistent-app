$ErrorActionPreference = "Stop"

$source = "C:\Users\Bruker\Pictures\Logo"
$logoTarget = Join-Path $PSScriptRoot "public\logo"
$iconsTarget = Join-Path $PSScriptRoot "public\icons"

$logoFiles = @(
    "fa-app-icon-180.png",
    "fa-app-icon-192.png",
    "fa-app-icon-512.png",
    "fa-app-icon-dark-180.png",
    "fa-app-icon-dark-192.png",
    "fa-app-icon-dark-512.png",
    "fa-header.png",
    "fa-header-dark.png"
)

$iconFiles = @(
    "fa-app-icon-180.png",
    "fa-app-icon-192.png",
    "fa-app-icon-512.png"
)

Write-Host "Synkroniserer Feltassistent-branding..." -ForegroundColor Cyan

if (-not (Test-Path $source)) {
    throw "Kildemappen finnes ikke: $source"
}

New-Item -ItemType Directory -Force $logoTarget | Out-Null
New-Item -ItemType Directory -Force $iconsTarget | Out-Null

Write-Host ""
Write-Host "Kopierer filer til public\logo..." -ForegroundColor Cyan

foreach ($file in $logoFiles) {
    $sourceFile = Join-Path $source $file
    $targetFile = Join-Path $logoTarget $file

    if (-not (Test-Path $sourceFile)) {
        throw "Mangler originalfil: $sourceFile"
    }

    $length = (Get-Item $sourceFile).Length

    if ($length -lt 1000) {
        throw "Originalfilen virker ugyldig eller tom: $sourceFile ($length bytes)"
    }

    Copy-Item $sourceFile $targetFile -Force
    Write-Host "Kopiert til public\logo: $file ($length bytes)"
}

Write-Host ""
Write-Host "Kopierer appikoner til public\icons..." -ForegroundColor Cyan

foreach ($file in $iconFiles) {
    $sourceFile = Join-Path $source $file
    $targetFile = Join-Path $iconsTarget $file

    if (-not (Test-Path $sourceFile)) {
        throw "Mangler originalfil: $sourceFile"
    }

    $length = (Get-Item $sourceFile).Length

    if ($length -lt 1000) {
        throw "Originalfilen virker ugyldig eller tom: $sourceFile ($length bytes)"
    }

    Copy-Item $sourceFile $targetFile -Force
    Write-Host "Kopiert til public\icons: $file ($length bytes)"
}

$wrongImagesFolder = Join-Path $PSScriptRoot "public\images"

if (Test-Path $wrongImagesFolder) {
    Remove-Item $wrongImagesFolder -Recurse -Force
    Write-Host ""
    Write-Host "Fjernet ubrukt mappe: public\images"
}

Get-ChildItem $iconsTarget `
    -Filter "fa-app-icon-dark-*.png" `
    -ErrorAction SilentlyContinue |
    Remove-Item -Force

Write-Host ""
Write-Host "Kontroll av filer i public\logo:" -ForegroundColor Cyan

Get-ChildItem $logoTarget |
    Where-Object { $_.Name -in $logoFiles } |
    Sort-Object Name |
    Select-Object Name, Length

Write-Host ""
Write-Host "Kontroll av filer i public\icons:" -ForegroundColor Cyan

Get-ChildItem $iconsTarget |
    Where-Object { $_.Name -in $iconFiles } |
    Sort-Object Name |
    Select-Object Name, Length

Write-Host ""
Write-Host "Git-status:" -ForegroundColor Cyan
git status --short