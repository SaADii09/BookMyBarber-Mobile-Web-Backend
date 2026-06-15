# BookMyBarber — fix Android native build on Windows (MAX_PATH + old Ninja).
#
# REQUIRED: Run PowerShell as Administrator (LongPathsEnabled needs elevation).
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   cd BookMyBarber-App
#   .\scripts\setup-windows-ninja.ps1
# Then restart Windows and: cd android; .\gradlew.bat clean; cd ..; npx expo run:android
#
# If you cannot change registry (locked PC), clone the repo to a short path e.g. C:\bmb\

$ErrorActionPreference = 'Stop'
$NinjaVersion = '1.12.1'
$NinjaUrl = "https://github.com/ninja-build/ninja/releases/download/v$NinjaVersion/ninja-win.zip"
$InstallDir = 'C:\ninja-win'
$NinjaExe = Join-Path $InstallDir 'ninja.exe'

Write-Host "=== BookMyBarber Windows Android build fix ===" -ForegroundColor Cyan

# 1. Enable long paths (requires elevation)
$fsKey = 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem'
try {
  $current = Get-ItemProperty -Path $fsKey -Name LongPathsEnabled -ErrorAction SilentlyContinue
  if ($current.LongPathsEnabled -ne 1) {
    Write-Host "Enabling LongPathsEnabled (restart may be required)..." -ForegroundColor Yellow
    New-ItemProperty -Path $fsKey -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force | Out-Null
    Write-Host "LongPathsEnabled set to 1. Restart Windows if builds still fail." -ForegroundColor Green
  } else {
    Write-Host "LongPathsEnabled already enabled." -ForegroundColor Green
  }
} catch {
  Write-Error @"
Could not enable LongPathsEnabled (admin required).
  1. Right-click PowerShell -> Run as administrator
  2. New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force
  3. Restart Windows, then re-run this script
Without long paths, Android CMake builds WILL fail on this deep project path.
"@
  exit 1
}

# 2. Install Ninja 1.12+ to C:\ninja-win
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$zip = Join-Path $env:TEMP "ninja-win-$NinjaVersion.zip"
Write-Host "Downloading Ninja $NinjaVersion..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $NinjaUrl -OutFile $zip -UseBasicParsing
Expand-Archive -Path $zip -DestinationPath $InstallDir -Force
Remove-Item $zip -Force
& $NinjaExe --version
Write-Host "Installed: $NinjaExe" -ForegroundColor Green

# 3. Replace Android SDK bundled Ninja (often 1.10.x)
$sdkRoots = @(
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT,
  'C:\Android\android-sdk',
  "$env:LOCALAPPDATA\Android\Sdk"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

foreach ($sdk in $sdkRoots) {
  $sdkNinja = Join-Path $sdk 'cmake\3.22.1\bin\ninja.exe'
  if (Test-Path (Split-Path $sdkNinja -Parent)) {
    $backup = "$sdkNinja.backup"
    if (-not (Test-Path $backup) -and (Test-Path $sdkNinja)) {
      Copy-Item $sdkNinja $backup -Force
      Write-Host "Backed up: $backup" -ForegroundColor DarkGray
    }
    Copy-Item $NinjaExe $sdkNinja -Force
    Write-Host "Updated SDK ninja: $sdkNinja" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart PC if this is the first time enabling long paths."
Write-Host "  2. cd BookMyBarber-App\android && .\gradlew.bat clean"
Write-Host "  3. cd .. && npx expo run:android"
Write-Host ""
Write-Host "Optional: shorten project path (e.g. subst B: `"$((Get-Location).Path -replace '\\BookMyBarber-App$','')`"; build from B:\BookMyBarber-App)" -ForegroundColor DarkGray
