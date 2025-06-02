# SagsHub Launcher
$Host.UI.RawUI.WindowTitle = "SagsHub"

# Skift til script directory
Set-Location $PSScriptRoot

# Start SagsHub
Write-Host "Starter SagsHub..." -ForegroundColor Green
& ".\start-sagshub.bat" 