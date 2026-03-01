from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os
from datetime import datetime

app = FastAPI(title="Vehicle Telemetry API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Data Models ====================

class TelemetryData(BaseModel):
    vehicle_id: str
    speed: float = Field(..., ge=0, le=300)
    engine_temp: float = Field(..., ge=0, le=150)
    rpm: float = Field(..., ge=0, le=10000)
    battery_voltage: float = Field(..., ge=0, le=24)
    fuel_level: float = Field(..., ge=0, le=100)
    timestamp: Optional[datetime] = None

class Alert(BaseModel):
    vehicle_id: str
    fault_type: str
    severity: str
    confidence: float
    timestamp: datetime
    actual_values: Dict[str, float]  # This should only contain numeric values

class DetectionResponse(BaseModel):
    vehicle_id: str
    timestamp: datetime
    data: TelemetryData
    alerts: List[Alert]
    is_anomaly: bool
    anomaly_score: float

# ==================== In-Memory Database ====================

telemetry_store = {}
alerts_store = []
MAX_STORE_SIZE = 1000

# ==================== ML Model Setup ====================

MODEL_PATH = "models/anomaly_model.pkl"

def create_sample_model():
    """Create a sample Isolation Forest model for demonstration"""
    print("Creating new sample model...")
    
    # Generate sample normal data
    np.random.seed(42)
    n_samples = 1000
    
    normal_data = pd.DataFrame({
        'speed': np.random.normal(60, 20, n_samples),
        'engine_temp': np.random.normal(85, 10, n_samples),
        'rpm': np.random.normal(2500, 500, n_samples),
        'battery_voltage': np.random.normal(12.5, 0.5, n_samples),
        'fuel_level': np.random.normal(50, 30, n_samples)
    })
    
    # Add some anomalies
    anomalies = pd.DataFrame({
        'speed': np.random.normal(150, 30, 50),
        'engine_temp': np.random.normal(120, 15, 50),
        'rpm': np.random.normal(7000, 1000, 50),
        'battery_voltage': np.random.normal(9, 2, 50),
        'fuel_level': np.random.normal(10, 5, 50)
    })
    
    training_data = pd.concat([normal_data, anomalies], ignore_index=True)
    
    # Train Isolation Forest
    model = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
    model.fit(training_data)
    
    return model

# Load or create model
try:
    if os.path.exists(MODEL_PATH):
        print(f"Loading model from {MODEL_PATH}...")
        model = joblib.load(MODEL_PATH)
        print("Model loaded successfully!")
    else:
        print("Model file not found. Creating new model...")
        os.makedirs("models", exist_ok=True)
        model = create_sample_model()
        joblib.dump(model, MODEL_PATH)
        print("New model created and saved!")
except Exception as e:
    print(f"Error loading model: {e}")
    print("Creating new model...")
    os.makedirs("models", exist_ok=True)
    model = create_sample_model()
    joblib.dump(model, MODEL_PATH)
    print("New model created and saved!")

# ==================== Rule-Based Detection ====================

def check_rules(data: TelemetryData) -> List[Alert]:
    """Check telemetry data against predefined rules"""
    alerts = []
    
    # Create actual_values dict with ONLY numeric values (exclude vehicle_id)
    actual_values = {
        "speed": data.speed,
        "engine_temp": data.engine_temp,
        "rpm": data.rpm,
        "battery_voltage": data.battery_voltage,
        "fuel_level": data.fuel_level
    }
    
    # Engine overheat
    if data.engine_temp > 100:
        severity = "High" if data.engine_temp > 115 else "Medium"
        confidence = min(0.95, (data.engine_temp - 100) / 30)
        alerts.append(Alert(
            vehicle_id=data.vehicle_id,
            fault_type="Engine Overheat",
            severity=severity,
            confidence=round(confidence, 2),
            timestamp=datetime.now(),
            actual_values=actual_values
        ))
    
    # Overspeed
    if data.speed > 120:
        severity = "High" if data.speed > 140 else "Medium"
        confidence = min(0.98, (data.speed - 120) / 50)
        alerts.append(Alert(
            vehicle_id=data.vehicle_id,
            fault_type="Overspeed",
            severity=severity,
            confidence=round(confidence, 2),
            timestamp=datetime.now(),
            actual_values=actual_values
        ))
    
    # Battery issue
    if data.battery_voltage < 11:
        severity = "High" if data.battery_voltage < 10 else "Medium"
        confidence = min(0.95, (12 - data.battery_voltage) / 3)
        alerts.append(Alert(
            vehicle_id=data.vehicle_id,
            fault_type="Battery Failure Risk",
            severity=severity,
            confidence=round(confidence, 2),
            timestamp=datetime.now(),
            actual_values=actual_values
        ))
    
    # High RPM
    if data.rpm > 6000:
        severity = "High" if data.rpm > 7000 else "Medium"
        confidence = min(0.96, (data.rpm - 6000) / 2000)
        alerts.append(Alert(
            vehicle_id=data.vehicle_id,
            fault_type="Engine Stress",
            severity=severity,
            confidence=round(confidence, 2),
            timestamp=datetime.now(),
            actual_values=actual_values
        ))
    
    # Low fuel
    if data.fuel_level < 10:
        alerts.append(Alert(
            vehicle_id=data.vehicle_id,
            fault_type="Low Fuel",
            severity="Medium",
            confidence=0.9,
            timestamp=datetime.now(),
            actual_values=actual_values
        ))
    
    return alerts

# ==================== ML-Based Detection ====================

def detect_anomaly_ml(data: TelemetryData) -> tuple:
    """Use ML model to detect anomalies"""
    try:
        # Prepare data for model
        features = pd.DataFrame([[
            data.speed,
            data.engine_temp,
            data.rpm,
            data.battery_voltage,
            data.fuel_level
        ]], columns=['speed', 'engine_temp', 'rpm', 'battery_voltage', 'fuel_level'])
        
        # Predict (-1 for anomalies, 1 for normal)
        prediction = model.predict(features)[0]
        
        # Get anomaly score (more negative = more anomalous)
        score = model.score_samples(features)[0]
        
        is_anomaly = prediction == -1
        
        return is_anomaly, float(score)
    except Exception as e:
        print(f"Error in ML detection: {e}")
        return False, 0.0

# ==================== API Endpoints ====================

@app.get("/")
async def root():
    return {
        "message": "Vehicle Telemetry Alert & Fault Detection System",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/ingest - POST telemetry data",
            "/vehicle/{vehicle_id}/recent - GET recent telemetry",
            "/alerts - GET all alerts",
            "/vehicle/{vehicle_id}/alerts - GET vehicle alerts",
            "/dashboard/stats - GET dashboard statistics"
        ]
    }

@app.post("/ingest", response_model=DetectionResponse)
async def ingest_telemetry(data: TelemetryData, background_tasks: BackgroundTasks):
    """
    Ingest telemetry data and perform real-time analysis
    """
    # Set timestamp if not provided
    if not data.timestamp:
        data.timestamp = datetime.now()
    
    # Store data
    if data.vehicle_id not in telemetry_store:
        telemetry_store[data.vehicle_id] = []
    
    telemetry_store[data.vehicle_id].append(data)
    
    # Limit store size
    if len(telemetry_store[data.vehicle_id]) > MAX_STORE_SIZE:
        telemetry_store[data.vehicle_id] = telemetry_store[data.vehicle_id][-MAX_STORE_SIZE:]
    
    # Rule-based detection
    rule_alerts = check_rules(data)
    
    # ML-based anomaly detection
    is_anomaly, anomaly_score = detect_anomaly_ml(data)
    
    # Generate ML alert if anomaly detected
    ml_alerts = []
    if is_anomaly and not rule_alerts:
        actual_values = {
            "speed": data.speed,
            "engine_temp": data.engine_temp,
            "rpm": data.rpm,
            "battery_voltage": data.battery_voltage,
            "fuel_level": data.fuel_level
        }
        ml_alert = Alert(
            vehicle_id=data.vehicle_id,
            fault_type="Unusual Pattern Detected",
            severity="Low" if anomaly_score > -0.3 else "Medium",
            confidence=round(abs(anomaly_score), 2),
            timestamp=datetime.now(),
            actual_values=actual_values
        )
        ml_alerts.append(ml_alert)
    
    # Combine all alerts
    all_alerts = rule_alerts + ml_alerts
    
    # Store alerts in background
    if all_alerts:
        background_tasks.add_task(store_alerts, all_alerts)
    
    return DetectionResponse(
        vehicle_id=data.vehicle_id,
        timestamp=data.timestamp,
        data=data,
        alerts=all_alerts,
        is_anomaly=is_anomaly,
        anomaly_score=anomaly_score
    )

def store_alerts(alerts: List[Alert]):
    """Store alerts in background"""
    global alerts_store
    for alert in alerts:
        alerts_store.append(alert)
    
    # Keep only recent alerts
    if len(alerts_store) > MAX_STORE_SIZE:
        alerts_store = alerts_store[-MAX_STORE_SIZE:]

@app.get("/vehicle/{vehicle_id}/recent")
async def get_recent_telemetry(vehicle_id: str, limit: int = 10):
    """Get recent telemetry data for a vehicle"""
    if vehicle_id not in telemetry_store:
        return {
            "vehicle_id": vehicle_id,
            "count": 0,
            "data": []
        }
    
    recent_data = telemetry_store[vehicle_id][-limit:]
    
    # Convert to dict for JSON serialization
    data_list = []
    for item in recent_data:
        data_list.append({
            "speed": item.speed,
            "engine_temp": item.engine_temp,
            "rpm": item.rpm,
            "battery_voltage": item.battery_voltage,
            "fuel_level": item.fuel_level,
            "timestamp": item.timestamp.isoformat() if item.timestamp else None
        })
    
    return {
        "vehicle_id": vehicle_id,
        "count": len(data_list),
        "data": data_list
    }

@app.get("/alerts")
async def get_all_alerts(severity: Optional[str] = None, limit: int = 50):
    """Get all alerts with optional severity filter"""
    global alerts_store
    
    filtered_alerts = alerts_store[-limit:]
    
    if severity:
        filtered_alerts = [a for a in filtered_alerts if a.severity == severity]
    
    # Convert to dict for JSON serialization
    alert_list = []
    for alert in filtered_alerts:
        alert_list.append({
            "vehicle_id": alert.vehicle_id,
            "fault_type": alert.fault_type,
            "severity": alert.severity,
            "confidence": alert.confidence,
            "timestamp": alert.timestamp.isoformat(),
            "actual_values": alert.actual_values
        })
    
    return {
        "total": len(alert_list),
        "alerts": alert_list
    }

@app.get("/vehicle/{vehicle_id}/alerts")
async def get_vehicle_alerts(vehicle_id: str, limit: int = 20):
    """Get alerts for a specific vehicle"""
    global alerts_store
    
    vehicle_alerts = [a for a in alerts_store if a.vehicle_id == vehicle_id][-limit:]
    
    # Convert to dict for JSON serialization
    alert_list = []
    for alert in vehicle_alerts:
        alert_list.append({
            "vehicle_id": alert.vehicle_id,
            "fault_type": alert.fault_type,
            "severity": alert.severity,
            "confidence": alert.confidence,
            "timestamp": alert.timestamp.isoformat(),
            "actual_values": alert.actual_values
        })
    
    return {
        "vehicle_id": vehicle_id,
        "total": len(alert_list),
        "alerts": alert_list
    }

@app.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get statistics for dashboard"""
    global alerts_store, telemetry_store
    
    total_alerts = len(alerts_store)
    
    severity_counts = {
        "High": len([a for a in alerts_store if a.severity == "High"]),
        "Medium": len([a for a in alerts_store if a.severity == "Medium"]),
        "Low": len([a for a in alerts_store if a.severity == "Low"])
    }
    
    fault_types = {}
    for alert in alerts_store[-100:]:
        fault_types[alert.fault_type] = fault_types.get(alert.fault_type, 0) + 1
    
    return {
        "total_alerts": total_alerts,
        "severity_distribution": severity_counts,
        "fault_type_distribution": fault_types,
        "active_vehicles": len(telemetry_store.keys())
    }

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🚗 Vehicle Telemetry Backend Server")
    print("=" * 50)
    print("📍 Server: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)