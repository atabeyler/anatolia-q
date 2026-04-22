param(
  [string]$AppUrl = "https://anatolia-q.onrender.com/",
  [switch]$PortableOnly
)

$ErrorActionPreference = "Stop"

Write-Host "T.C. ANATOLIA-Q masaustu paketi hazirlaniyor..." -ForegroundColor Cyan

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm bulunamadi. Node.js kurulu olmali."
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:ANATOLIA_Q_DESKTOP_URL = $AppUrl

Write-Host "Baglanilan adres: $AppUrl" -ForegroundColor DarkCyan
Write-Host "Bagimliliklar yukleniyor..." -ForegroundColor Cyan
npm install

if ($PortableOnly) {
  Write-Host "Portable paket uretiliyor..." -ForegroundColor Cyan
  npm run desktop:dist:portable
}
else {
  Write-Host "Portable + kurulum paketi uretiliyor..." -ForegroundColor Cyan
  npm run desktop:dist
}

Write-Host "Tamamlandi. Ciktilar dist klasorunde." -ForegroundColor Green
