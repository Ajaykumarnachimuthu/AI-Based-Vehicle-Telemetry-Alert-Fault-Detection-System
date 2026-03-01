import requests
import time
import random
import numpy as np
from datetime import datetime
import threading
import os
import sys

# ==================== SAMPLE DATA CONFIGURATION ====================

# Vehicle fleet
VEHICLES = [
    {"id": "V101", "name": "Tesla Model 3", "type": "Electric"},
    {"id": "V102", "name": "Ford F-150", "type": "Petrol"},
    {"id": "V103", "name": "Toyota Camry", "type": "Hybrid"},
    {"id": "V104", "name": "BMW X5", "type": "Diesel"},
    {"id": "V105", "name": "Mercedes Sprinter", "type": "Diesel"}
]

# Normal operating ranges for each parameter
NORMAL_RANGES = {
    'speed': {'min': 40, 'max': 80, 'unit': 'km/h', 'warning': 120, 'critical': 140},
    'engine_temp': {'min': 75, 'max': 95, 'unit': '°C', 'warning': 100, 'critical': 115},
    'rpm': {'min': 1500, 'max': 3500, 'unit': 'RPM', 'warning': 6000, 'critical': 7000},
    'battery_voltage': {'min': 11.8, 'max': 13.2, 'unit': 'V', 'warning': 11.0, 'critical': 10.0},
    'fuel_level': {'min': 20, 'max': 90, 'unit': '%', 'warning': 10, 'critical': 5}
}

# Ideal normal values (for reset)
IDEAL_NORMAL = {
    'speed': 65,
    'engine_temp': 85,
    'rpm': 2500,
    'battery_voltage': 12.6,
    'fuel_level': 75
}

# Fault scenarios with realistic values
FAULT_SCENARIOS = [
    {
        'name': 'Engine Overheat',
        'severity': 'High',
        'values': {
            'speed': 80,
            'engine_temp': 118,
            'rpm': 3200,
            'battery_voltage': 12.3,
            'fuel_level': 60
        },
        'duration': (8, 15),
        'probability': 0.15,
        'description': 'Cooling system failure - Immediate action required'
    },
    {
        'name': 'Overspeed',
        'severity': 'High',
        'values': {
            'speed': 155,
            'engine_temp': 95,
            'rpm': 4500,
            'battery_voltage': 12.4,
            'fuel_level': 50
        },
        'duration': (3, 8),
        'probability': 0.10,
        'description': 'Vehicle exceeding safe speed limits'
    },
    {
        'name': 'Battery Failure',
        'severity': 'High',
        'values': {
            'speed': 45,
            'engine_temp': 82,
            'rpm': 1800,
            'battery_voltage': 9.8,
            'fuel_level': 40
        },
        'duration': (10, 20),
        'probability': 0.08,
        'description': 'Critical battery voltage drop'
    },
    {
        'name': 'Engine Stress',
        'severity': 'Medium',
        'values': {
            'speed': 110,
            'engine_temp': 105,
            'rpm': 7200,
            'battery_voltage': 12.1,
            'fuel_level': 30
        },
        'duration': (4, 10),
        'probability': 0.12,
        'description': 'Engine running at dangerously high RPM'
    },
    {
        'name': 'Low Fuel',
        'severity': 'Medium',
        'values': {
            'speed': 70,
            'engine_temp': 88,
            'rpm': 2500,
            'battery_voltage': 12.5,
            'fuel_level': 5
        },
        'duration': (15, 30),
        'probability': 0.10,
        'description': 'Fuel level critically low'
    },
    {
        'name': 'Electrical Fluctuation',
        'severity': 'Low',
        'values': {
            'speed': 60,
            'engine_temp': 90,
            'rpm': 2800,
            'battery_voltage': 10.8,
            'fuel_level': 55
        },
        'duration': (5, 12),
        'probability': 0.12,
        'description': 'Unstable voltage detected'
    },
    {
        'name': 'Sensor Glitch',
        'severity': 'Low',
        'values': {
            'speed': 150,  # Spikes
            'engine_temp': 110,  # Spikes
            'rpm': 6500,   # Spikes
            'battery_voltage': 14.5,  # Overcharging
            'fuel_level': 15
        },
        'duration': (2, 5),
        'probability': 0.08,
        'description': 'Erratic sensor readings'
    }
]

# Gradual degradation patterns
DEGRADATION_PATTERNS = {
    'slow_overheat': {
        'rate': 0.1,  # degrees per second
        'target': 118,
        'description': 'Gradual temperature increase'
    },
    'fuel_depletion': {
        'rate': 0.05,  # percent per second
        'target': 0,
        'description': 'Slow fuel consumption'
    },
    'battery_drain': {
        'rate': 0.02,  # volts per second
        'target': 9.5,
        'description': 'Battery discharging'
    }
}

# Vehicle type specific variations
VEHICLE_TYPE_VARIATIONS = {
    'Electric': {
        'speed_factor': 1.2,
        'temp_factor': 0.7,
        'battery_factor': 1.5,
        'rpm_factor': 0.5
    },
    'Petrol': {
        'speed_factor': 1.0,
        'temp_factor': 1.2,
        'battery_factor': 1.0,
        'rpm_factor': 1.2
    },
    'Diesel': {
        'speed_factor': 0.9,
        'temp_factor': 1.1,
        'battery_factor': 0.9,
        'rpm_factor': 0.8
    },
    'Hybrid': {
        'speed_factor': 1.0,
        'temp_factor': 0.8,
        'battery_factor': 1.3,
        'rpm_factor': 0.9
    }
}

class VehicleTelemetrySimulator:
    def __init__(self):
        self.vehicles = {}
        self.active_faults = {}
        self.running = True
        self.stats = {
            'total_readings': 0,
            'total_alerts': 0,
            'fault_counts': {}
        }
        
        # Initialize each vehicle
        for vehicle in VEHICLES:
            vehicle_id = vehicle['id']
            self.vehicles[vehicle_id] = {
                'info': vehicle,
                'state': 'normal',
                'current_values': self.generate_normal_data(vehicle['type']),
                'degradation': None,
                'fault_start': None
            }
    
    def generate_normal_data(self, vehicle_type):
        """Generate normal telemetry data with vehicle-specific variations"""
        variation = VEHICLE_TYPE_VARIATIONS.get(vehicle_type, VEHICLE_TYPE_VARIATIONS['Petrol'])
        
        data = {}
        for param, ranges in NORMAL_RANGES.items():
            base_value = random.uniform(ranges['min'], ranges['max'])
            
            # Apply vehicle type variation
            if param == 'speed':
                base_value *= variation['speed_factor']
            elif param == 'engine_temp':
                base_value *= variation['temp_factor']
            elif param == 'battery_voltage':
                base_value *= variation['battery_factor']
            elif param == 'rpm':
                base_value *= variation['rpm_factor']
            
            # Add small random variation
            data[param] = base_value + random.uniform(-1, 1)
        
        return data
    
    def check_fault_condition(self, data):
        """Check if current data triggers any fault"""
        alerts = []
        
        # Check each parameter against thresholds
        for param, value in data.items():
            if param in NORMAL_RANGES:
                ranges = NORMAL_RANGES[param]
                
                # Check for critical fault
                if 'critical' in ranges and value > ranges['critical']:
                    alerts.append({
                        'type': f'High {param.replace("_", " ").title()}',
                        'severity': 'High',
                        'value': value,
                        'threshold': ranges['critical']
                    })
                # Check for warning
                elif 'warning' in ranges and value > ranges['warning']:
                    alerts.append({
                        'type': f'{param.replace("_", " ").title()} Warning',
                        'severity': 'Medium',
                        'value': value,
                        'threshold': ranges['warning']
                    })
        
        return alerts
    
    def apply_fault_scenario(self, vehicle_id, scenario):
        """Apply a fault scenario to a vehicle"""
        vehicle = self.vehicles[vehicle_id]
        fault_values = scenario['values'].copy()
        
        # Add some randomness to fault values
        for param, value in fault_values.items():
            fault_values[param] = value + random.uniform(-2, 2)
        
        vehicle['current_values'] = fault_values
        vehicle['state'] = scenario['name']
        vehicle['fault_start'] = time.time()
        
        return fault_values
    
    def apply_degradation(self, vehicle_id, pattern):
        """Apply gradual degradation to a vehicle"""
        vehicle = self.vehicles[vehicle_id]
        
        if vehicle['degradation'] is None:
            vehicle['degradation'] = {
                'pattern': pattern,
                'start_value': vehicle['current_values'].copy(),
                'start_time': time.time()
            }
        
        # Calculate degraded values based on time
        elapsed = time.time() - vehicle['degradation']['start_time']
        
        if pattern == 'slow_overheat':
            vehicle['current_values']['engine_temp'] = min(
                118,
                vehicle['degradation']['start_value']['engine_temp'] + (elapsed * 0.1)
            )
        elif pattern == 'fuel_depletion':
            vehicle['current_values']['fuel_level'] = max(
                0,
                vehicle['degradation']['start_value']['fuel_level'] - (elapsed * 0.05)
            )
        elif pattern == 'battery_drain':
            vehicle['current_values']['battery_voltage'] = max(
                9.5,
                vehicle['degradation']['start_value']['battery_voltage'] - (elapsed * 0.02)
            )
    
    def send_telemetry(self, vehicle_id):
        """Send telemetry data to backend"""
        vehicle = self.vehicles[vehicle_id]
        data = vehicle['current_values']
        
        # Add vehicle_id and timestamp
        payload = {
            'vehicle_id': vehicle_id,
            'speed': round(data['speed'], 1),
            'engine_temp': round(data['engine_temp'], 1),
            'rpm': round(data['rpm']),
            'battery_voltage': round(data['battery_voltage'], 1),
            'fuel_level': round(data['fuel_level']),
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            response = requests.post("http://localhost:8000/ingest", json=payload, timeout=1)
            
            if response.status_code == 200:
                result = response.json()
                self.stats['total_readings'] += 1
                
                if result['alerts']:
                    self.stats['total_alerts'] += len(result['alerts'])
                    for alert in result['alerts']:
                        fault_type = alert['fault_type']
                        self.stats['fault_counts'][fault_type] = self.stats['fault_counts'].get(fault_type, 0) + 1
                
                return result
        except:
            pass
        
        return None
    
    def print_status(self):
        """Print current status of all vehicles"""
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print("=" * 80)
        print("🚗 VEHICLE TELEMETRY SIMULATOR")
        print("=" * 80)
        
        # Check backend connection
        try:
            requests.get("http://localhost:8000", timeout=1)
            print("✅ Backend: Connected")
        except:
            print("❌ Backend: Disconnected")
        
        print("\n📊 FLEET STATUS:")
        print("-" * 80)
        
        for vehicle_id, vehicle in self.vehicles.items():
            info = vehicle['info']
            data = vehicle['current_values']
            
            # Determine status color/indicator
            if vehicle['state'] != 'normal':
                status = f"⚠️ {vehicle['state']}"
            else:
                status = "✅ Normal"
            
            print(f"\n{info['id']} - {info['name']} ({info['type']})")
            print(f"  Status: {status}")
            print(f"  Speed: {data['speed']:.1f} km/h | Temp: {data['engine_temp']:.1f}°C | RPM: {data['rpm']:.0f}")
            print(f"  Battery: {data['battery_voltage']:.1f}V | Fuel: {data['fuel_level']:.1f}%")
        
        print("\n📈 STATISTICS:")
        print("-" * 80)
        print(f"Total Readings: {self.stats['total_readings']}")
        print(f"Total Alerts: {self.stats['total_alerts']}")
        
        if self.stats['fault_counts']:
            print("\n🔍 FAULT BREAKDOWN:")
            for fault, count in sorted(self.stats['fault_counts'].items(), key=lambda x: x[1], reverse=True):
                print(f"  {fault}: {count}")
    
    def simulate_vehicle(self, vehicle_id):
        """Simulate a single vehicle"""
        while self.running:
            try:
                vehicle = self.vehicles[vehicle_id]
                
                # Check if fault is active
                if vehicle['state'] != 'normal':
                    # Check if fault duration expired
                    if vehicle['fault_start'] and (time.time() - vehicle['fault_start']) > 10:
                        vehicle['state'] = 'normal'
                        vehicle['current_values'] = self.generate_normal_data(vehicle['info']['type'])
                
                # Randomly trigger faults
                elif random.random() < 0.02:  # 2% chance per iteration
                    scenario = random.choice(FAULT_SCENARIOS)
                    self.apply_fault_scenario(vehicle_id, scenario)
                
                # Randomly apply degradation
                elif random.random() < 0.01:  # 1% chance
                    pattern = random.choice(list(DEGRADATION_PATTERNS.keys()))
                    self.apply_degradation(vehicle_id, pattern)
                
                # Normal variation
                else:
                    for param in NORMAL_RANGES.keys():
                        current = vehicle['current_values'][param]
                        variation = random.uniform(-1, 1)
                        new_value = current + variation
                        
                        # Keep within normal ranges
                        ranges = NORMAL_RANGES[param]
                        new_value = max(ranges['min'], min(ranges['max'], new_value))
                        vehicle['current_values'][param] = new_value
                
                # Send to backend
                self.send_telemetry(vehicle_id)
                
                # Update display for first vehicle
                if vehicle_id == VEHICLES[0]['id']:
                    self.print_status()
                
                time.sleep(random.uniform(0.5, 1.5))
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(1)
    
    def start(self):
        """Start simulation for all vehicles"""
        print("Starting vehicle telemetry simulator...")
        print(f"Simulating {len(VEHICLES)} vehicles")
        
        # Check backend
        try:
            requests.get("http://localhost:8000", timeout=2)
            print("✅ Connected to backend")
        except:
            print("❌ Cannot connect to backend")
            return
        
        # Start threads
        threads = []
        for vehicle in VEHICLES:
            thread = threading.Thread(target=self.simulate_vehicle, args=(vehicle['id'],))
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        print("\nSimulation running. Press Ctrl+C to stop.\n")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping simulator...")
            self.running = False
            time.sleep(1)
            print("Simulator stopped")

if __name__ == "__main__":
    simulator = VehicleTelemetrySimulator()
    simulator.start()