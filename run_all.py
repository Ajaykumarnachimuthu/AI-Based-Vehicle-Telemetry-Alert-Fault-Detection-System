
"""
One-click launcher for Vehicle Telemetry System
Place this file in the root folder: vehicle-telemetry-system/run_all.py
"""

import subprocess
import time
import webbrowser
import os
import sys
import platform

def print_colored(text, color='white'):
    """Print colored text"""
    colors = {
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'purple': '\033[95m',
        'cyan': '\033[96m',
        'end': '\033[0m'
    }
    print(f"{colors.get(color, '')}{text}{colors['end']}")

def clear_screen():
    """Clear terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def check_python():
    """Check Python version"""
    if sys.version_info < (3, 8):
        print_colored("❌ Python 3.8 or higher is required!", 'red')
        print_colored(f"   Current version: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", 'yellow')
        return False
    print_colored(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", 'green')
    return True

def check_backend_requirements():
    """Check if backend requirements are installed"""
    try:
        import fastapi
        import uvicorn
        import pandas
        import numpy
        import sklearn
        import joblib
        print_colored("✅ Backend requirements already installed", 'green')
        return True
    except ImportError as e:
        print_colored(f"⚠️  Missing requirement: {e}", 'yellow')
        return False

def install_requirements():
    """Install required packages"""
    print_colored("\n📦 Installing backend requirements...", 'yellow')
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "backend/requirements.txt"])
        print_colored("✅ Requirements installed successfully!", 'green')
        return True
    except subprocess.CalledProcessError as e:
        print_colored(f"❌ Failed to install requirements: {e}", 'red')
        return False

def run_backend():
    """Run FastAPI backend"""
    print_colored("\n🚀 Starting Backend Server...", 'cyan')
    
    if platform.system() == "Windows":
        # Windows: open new terminal
        return subprocess.Popen(
            f'start cmd /k "cd backend && {sys.executable} app.py"',
            shell=True
        )
    else:
        # Mac/Linux: open new terminal
        return subprocess.Popen(
            [sys.executable, "backend/app.py"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

def run_simulator():
    """Run vehicle simulator"""
    print_colored("🚗 Starting Vehicle Simulator...", 'cyan')
    
    if platform.system() == "Windows":
        return subprocess.Popen(
            f'start cmd /k "cd backend && {sys.executable} vehicle_simulator.py"',
            shell=True
        )
    else:
        return subprocess.Popen(
            [sys.executable, "backend/vehicle_simulator.py"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

def open_frontend():
    """Open frontend in browser"""
    print_colored("🌐 Opening Frontend Dashboard...", 'cyan')
    
    # Get the absolute path to index.html
    frontend_path = os.path.abspath(os.path.join("frontend", "index.html"))
    
    # Open in browser
    webbrowser.open(f"file://{frontend_path}")
    
    return True

def main():
    """Main function"""
    clear_screen()
    
    print_colored("=" * 60, 'purple')
    print_colored("🚗 VEHICLE TELEMETRY SYSTEM LAUNCHER", 'purple')
    print_colored("=" * 60, 'purple')
    print()
    
    # Check Python
    if not check_python():
        input("\nPress Enter to exit...")
        return
    
    # Check if we're in the right directory
    if not os.path.exists("backend") or not os.path.exists("frontend"):
        print_colored("❌ Wrong directory! Run this script from the root folder:", 'red')
        print_colored("   vehicle-telemetry-system/", 'yellow')
        input("\nPress Enter to exit...")
        return
    
    # Check/install requirements
    if not check_backend_requirements():
        print_colored("\n⚠️  Requirements not found. Installing...", 'yellow')
        if not install_requirements():
            input("\nPress Enter to exit...")
            return
    
    print_colored("\n" + "=" * 60, 'green')
    print_colored("✅ READY TO LAUNCH!", 'green')
    print_colored("=" * 60, 'green')
    print()
    
    # Ask user what to run
    print_colored("What would you like to start?", 'cyan')
    print_colored("1. 🚗 Everything (Backend + Simulator + Dashboard)", 'white')
    print_colored("2. 🔧 Backend + Dashboard only", 'white')
    print_colored("3. 📊 Dashboard only (if backend already running)", 'white')
    print()
    
    choice = input("Enter choice (1/2/3): ").strip()
    
    if choice == "1":
        # Start everything
        backend = run_backend()
        time.sleep(3)
        simulator = run_simulator()
        time.sleep(2)
        open_frontend()
        
        print_colored("\n" + "=" * 60, 'green')
        print_colored("✅ ALL SYSTEMS RUNNING!", 'green')
        print_colored("=" * 60, 'green')
        print_colored("\n📍 Backend:  http://localhost:8000", 'cyan')
        print_colored("📍 Dashboard: file opened in browser", 'cyan')
        print_colored("📍 API Docs:  http://localhost:8000/docs", 'cyan')
        print_colored("\n📝 Close the terminal windows to stop", 'yellow')
        
    elif choice == "2":
        # Backend + Dashboard
        backend = run_backend()
        time.sleep(3)
        open_frontend()
        
        print_colored("\n" + "=" * 60, 'green')
        print_colored("✅ BACKEND + DASHBOARD RUNNING!", 'green')
        print_colored("=" * 60, 'green')
        print_colored("\n📍 Backend:  http://localhost:8000", 'cyan')
        print_colored("📍 Dashboard: file opened in browser", 'cyan')
        print_colored("\n📝 To add simulator, run:", 'yellow')
        print_colored("   cd backend && python vehicle_simulator.py", 'yellow')
        
    elif choice == "3":
        # Dashboard only
        open_frontend()
        
        print_colored("\n" + "=" * 60, 'green')
        print_colored("✅ DASHBOARD OPENED!", 'green')
        print_colored("=" * 60, 'green')
        print_colored("\n📍 Make sure backend is running at: http://localhost:8000", 'yellow')
        
    else:
        print_colored("❌ Invalid choice!", 'red')
    
    print_colored("\n👋 Press Ctrl+C to exit this launcher", 'yellow')
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print_colored("\n\n👋 Goodbye!", 'purple')

if __name__ == "__main__":
    main()