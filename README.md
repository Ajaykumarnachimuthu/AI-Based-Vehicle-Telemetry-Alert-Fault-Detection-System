🚗 AI-Based Vehicle Telemetry & Fault Detection System
<br>
<p align="center"> <img src="images/dashboard.png" alt="Dashboard Preview" width="800"/> <br> 
<em>Real-time vehicle monitoring with AI-powered fault detection</em> </p>
<p align="center"> <a href="https://render.com/deploy?repo=https://github.com/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System">
<img src="https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Deploy to Render"> </a>
 <a href="https://github.com/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System/stargazers"> 
<img src="https://img.shields.io/github/stars/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System?style=for-the-badge&logo=github" alt="GitHub stars"> </a>
 <a href="https://github.com/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System/blob/main/LICENSE"> <img src="https://img.shields.io/github/license/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System?style=for-the-badge" alt="License"> </a> </p>
<p align="center"> <img src="https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python" alt="Python"> <img src="https://img.shields.io/badge/FastAPI-0.104-green?style=flat-square&logo=fastapi" alt="FastAPI"> <img src="https://img.shields.io/badge/scikit--learn-1.3-orange?style=flat-square&logo=scikit-learn" alt="scikit-learn"> <img src="https://img.shields.io/badge/JavaScript-ES6-yellow?style=flat-square&logo=javascript" alt="JavaScript"> <img src="https://img.shields.io/badge/Docker-✓-blue?style=flat-square&logo=docker" alt="Docker"> </p>
<br>
🎯 Overview
AI-Based Vehicle Telemetry & Fault Detection System is a real-time monitoring solution that collects vehicle operational data (speed, temperature, RPM, battery voltage, fuel level) and uses a hybrid approach of rule-based thresholds and machine learning anomaly detection to identify potential faults before they cause breakdowns.

The system features an interactive web dashboard with 3D car animation, live gauges, color-coded alerts, and sound notifications - making it perfect for fleet management, preventive maintenance, and educational purposes.
<br>
**FEATURES**
<br>
**Intelligent Detection**<br>

⚡ Rule-Based Detection-Threshold alerts for known issues<br>
🤖 ML Anomaly Detection-Isolation Forest finds unknown patterns<br>
🎯 Severity Classification-High/Medium/Low with confidence scores<br>
🔔 Sound Alerts	Different-sounds per severity level<br>

**User Interface**<br>

📱 Responsive Design	Works on desktop, tablet, mobile<br>
🎨 Modern UI	Clean, professional interface<br>
📋 Alert History	Filterable log with timestamps<br>
🎛️ Manual Controls	Sliders to test different scenarios<br>
<br>

🌐 Live Demo
<p align="center"> <a href="https://vehicle-telemetry-dashboard.onrender.com"> <img src="https://img.shields.io/badge/View%20Dashboard-2563eb?style=for-the-badge&logo=google-chrome&logoColor=white" alt="View Dashboard"> </a> <a href="https://vehicle-telemetry-api.onrender.com/docs"> <img src="https://img.shields.io/badge/API%20Docs-10b981?style=for-the-badge&logo=swagger&logoColor=white" alt="API Docs"> </a> <a href="https://vehicle-telemetry-api.onrender.com"> <img src="https://img.shields.io/badge/Backend%20API-64748b?style=for-the-badge&logo=fastapi&logoColor=white" alt="Backend API"> </a> </p>
Component	URL	Status
Frontend Dashboard	https://ai-based-vehicle-telemetry-alert-fault.onrender.com	 ✅ Live<br>
Backend API	https://vehicle-telemetry-api.onrender.com                          ✅ Live<br>
API Documentation	https://vehicle-telemetry-api.onrender.com/docs	              ✅ Live<br>
<br>
🏗️ System Architecture
<p align="center"> <img src="images/arch.png" alt="Architecture" width="100%"/> </p>
<br>



AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System/<br>
├── 📂 backend/<br>
│   ├── 📄 app.py                 # FastAPI main application<br>
│   ├── 📄 vehicle_simulator.py   # Data generator<br>
│   ├── 📄 requirements.txt       # Python dependencies<br>
│   ├── 📄 Dockerfile              # Container configuration<br>
│   └── 📂 models/                 # ML model storage<br>
│       └── 📄 anomaly_model.pkl   # Trained Isolation Forest<br>
├── 📂 frontend/
│   ├── 📄 index.html                   # Main dashboard<br>
│   ├── 📄 styles.css               # Styling<br>
│   └── 📄 script.js                # Frontend logic<br>
├── 📄 render.yaml                  # Render deployment config<br>
├── 📄 docker-compose.yml           # Docker Compose config<br>
├── 📄 run_all.py                   # Local launcher script<br>
├── 📄 .gitignore                   # Git ignore file<br>
└── 📄 README.md                    # This file<br>


**Project Link:** https://github.com/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System

⭐ Support
<p align="center"> If you like this project, please give it a ⭐ on GitHub! </p><p align="center"> <a href="https://github.com/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System/stargazers"> <img src="https://img.shields.io/github/stars/Ajaykumarnachimuthu/AI-Based-Vehicle-Telemetry-Alert-Fault-Detection-System?style=social" alt="GitHub stars"> </a> </p>
<p align="center"> <b>Made with ❤️ for Hackathons and Innovation</b> <br> <img src="https://forthebadge.com/images/badges/built-with-love.svg" alt="Built with Love" width="150"/> </p>
