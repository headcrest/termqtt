param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$Version = "latest",
  [string]$Prefix = "$env:USERPROFILE\.termqtt"
)

$os = "windows"
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }

$asset = "termqtt-$os-$arch.zip"
if ($Version -eq "latest") {
  $url = "https://github.com/$Repo/releases/latest/download/$asset"
} else {
  $url = "https://github.com/$Repo/releases/download/$Version/$asset"
}

$temp = New-Item -ItemType Directory -Path ([System.IO.Path]::GetTempPath()) -Name ([System.Guid]::NewGuid().ToString())
$zipPath = Join-Path $temp $asset

Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $zipPath

New-Item -ItemType Directory -Force -Path $Prefix | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $temp\unpacked -Force

Copy-Item "$temp\unpacked\termqtt.exe" "$Prefix\termqtt.exe" -Force
Copy-Item "$temp\unpacked\parser.worker.js" "$Prefix\parser.worker.js" -Force
Copy-Item "$temp\unpacked\tree-sitter.wasm" "$Prefix\tree-sitter.wasm" -Force

Write-Host "Installed to $Prefix"
Write-Host "Add to PATH: setx PATH \"$Prefix;$env:PATH\""
