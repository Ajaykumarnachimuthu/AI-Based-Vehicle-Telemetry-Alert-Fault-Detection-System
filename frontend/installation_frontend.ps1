# install_frontend.ps1
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  INSTALLING FRONTEND DEPENDENCIES   " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# List of required packages
$packages = @(
    "streamlit==1.28.1",
    "requests==2.31.0", 
    "pandas==2.1.3",
    "plotly==5.18.0"
)

foreach ($package in $packages) {
    Write-Host "Installing $package..." -ForegroundColor Yellow
    pip install $package
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $package installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install $package" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "📦 Installed packages:" -ForegroundColor Cyan
pip list | findstr /i "streamlit requests pandas plotly"

Write-Host ""
Write-Host "🚀 You can now run the frontend with:" -ForegroundColor Green
Write-Host "python -m streamlit run app.py" -ForegroundColor Yellow