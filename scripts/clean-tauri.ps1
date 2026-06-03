# Clean Tauri build artifacts (PowerShell)
# Run from repository root: .\scripts\clean-tauri.ps1

Write-Output "Cleaning Tauri and target build artifacts..."

Push-Location "src-tauri"
if (Test-Path "target") {
    Remove-Item -Recurse -Force "target"
    Write-Output "Removed src-tauri/target"
} else {
    Write-Output "No src-tauri/target folder found"
}

# cargo clean (if Rust toolchain available)
try {
    & cargo clean
    Write-Output "cargo clean executed"
} catch {
    Write-Output "cargo clean failed or cargo not installed: $_"
}

Pop-Location

# Optionally remove built frontend dist/vite caches
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Output "Removed dist/"
}

Write-Output "Done. You can now rebuild the app (npm install && npm run tauri dev/build)."