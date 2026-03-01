import requests
import time
import random
import numpy as np
from datetime import datetime
import threading
import json
from colorama import init, Fore, Style
import os

# Initialize colorama for colored output
init(autoreset=True)

# Configuration
API_URL = "http://localhost:8000"
VEHICLES = ["V101", "V102", "V103", "V104", "V105"]  # Fleet of vehicles

# Normal operating ranges for each parameter
NORMAL_RANGES = {
    'speed': (40, 80),           # km/h
    'engine_temp': (75, 95),      # °C
    'rpm': (1500, 3500),          # RPM
    'battery_voltage': (11.8, 13.2),  # Volts
    'fuel_level': (20, 90)        # Percentage
}

# Fault conditions and their effects
FAULT_SCENARIOS = [
    {
        'name': 'Engine Overheat',
        'severity': 'High',
        'params': {
            'engine_temp': (105, 130),  # Overheating range
            'speed': (60, 100),         # Normal-ish speed
            'rpm': (3000, 4500)         # Higher RPM
        },
        'duration': (5, 15),  # seconds
        'probability': 0.15
    },
    {
        'name': 'Overspeed',
        'severity': 'High',
        'params': {
            'speed': (130, 180),        # Very fast
            'engine_temp': (85, 100),    # Normal to warm
            'rpm': (4500, 6500)          # High RPM
        },
        'duration': (3, 8),
        'probability': 0.10
    },
    {
        'name': 'Battery Failure',
        'severity': 'High',
        'params': {
            'battery_voltage': (8, 10.5),  # Low voltage
            'speed': (40, 60),              # Slower
            'rpm': (1000, 2000),             # Lower RPM
            'engine_temp': (70, 85)          # Normal
        },
        'duration': (10, 30),
        'probability': 0.08
    },
    {
        'name': 'Engine Stress',
        'severity': 'Medium',
        'params': {
            'rpm': (6000, 8000),         # Very high RPM
            'engine_temp': (95, 110),      # Hot
            'speed': (100, 140),           # Fast
            'battery_voltage': (12.0, 13.0)  # Normal
        },
        'duration': (4, 10),
        'probability': 0.12
    },
    {
        'name': 'Low Fuel',
        'severity': 'Medium',
        'params': {
            'fuel_level': (2, 8),          # Very low
            'speed': (50, 90),              # Normal
            'engine_temp': (80, 95),        # Normal
            'rpm': (2000, 3500)             # Normal
        },
        'duration': (20, 60),
        'probability': 0.10
    },
    {
        'name': 'Cooling System Issue',
        'severity': 'Medium',
        'params': {
            'engine_temp': (100, 115),      # Hot but not critical
            'speed': (60, 90),               # Normal
            'rpm': (2500, 4000)              # Slightly high
        },
        'duration': (8, 20),
        'probability': 0.12
    },
    {
        'name': 'Electrical Fluctuation',
        'severity': 'Low',
        'params': {
            'battery_voltage': (10.5, 11.5),  # Unstable
            'rpm': (2000, 4000),               # Varying
            'engine_temp': (85, 100)           # Normal-warm
        },
        'duration': (5, 15),
        'probability': 0.15
    },
    {
        'name': 'Sensor Glitch',
        'severity': 'Low',
        'params': {
            'speed': (0, 200),                 # Random spikes
            'engine_temp': (70, 130),           # Random spikes
            'rpm': (1000, 9000),                # Random spikes
            'fuel_level': (0, 100)              # Random spikes
        },
        'duration': (2, 5),
        'probability': 0.08
    }
]

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
        
        # Initialize vehicle states
        for vehicle_id in VEHICLES:
            self.vehicles[vehicle_id] = {
                'current_state': 'normal',
                'fault_start_time': None,
                'current_fault': None,
                'last_values': self.generate_normal_data()
            }
    
    def generate_normal_data(self):
        """Generate normal telemetry data"""
        return {
            'speed': random.uniform(*NORMAL_RANGES['speed']),
            'engine_temp': random.uniform(*NORMAL_RANGES['engine_temp']),
            'rpm': random.uniform(*NORMAL_RANGES['rpm']),
            'battery_voltage': random.uniform(*NORMAL_RANGES['battery_voltage']),
            'fuel_level': random.uniform(*NORMAL_RANGES['fuel_level'])
        }
    
    def generate_fault_data(self, fault_scenario):
        """Generate data for a specific fault scenario"""
        data = {}
        
        # Generate values for each parameter based on fault scenario
        for param, range_values in fault_scenario['params'].items():
            if isinstance(range_values, tuple):
                data[param] = random.uniform(*range_values)
            else:
                data[param] = range_values
        
        # Fill in any missing parameters with normal ranges
        for param in NORMAL_RANGES.keys():
            if param not in data:
                data[param] = random.uniform(*NORMAL_RANGES[param])
        
        return data
    
    def select_fault(self):
        """Randomly select a fault scenario based on probabilities"""
        if random.random() < 0.3:  # 30% chance of fault
            # Weighted random selection
            faults = FAULT_SCENARIOS
            probabilities = [f['probability'] for f in faults]
            return random.choices(faults, weights=probabilities, k=1)[0]
        return None
    
    def send_telemetry(self, vehicle_id, data):
        """Send telemetry data to the backend"""
        try:
            payload = {
                'vehicle_id': vehicle_id,
                **data,
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(f"{API_URL}/ingest", json=payload, timeout=2)
            
            if response.status_code == 200:
                result = response.json()
                
                # Update stats
                self.stats['total_readings'] += 1
                if result['alerts']:
                    self.stats['total_alerts'] += len(result['alerts'])
                    for alert in result['alerts']:
                        fault_type = alert['fault_type']
                        self.stats['fault_counts'][fault_type] = self.stats['fault_counts'].get(fault_type, 0) + 1
                
                return result
            else:
                print(f"{Fore.RED}Error sending data: {response.status_code}")
                return None
        except requests.exceptions.ConnectionError:
            print(f"{Fore.RED}Cannot connect to backend at {API_URL}")
            return None
        except Exception as e:
            print(f"{Fore.RED}Error: {e}")
            return None
    
    def print_status(self, vehicle_id, data, result, fault_info=None):
        """Print colored status information"""
        os.system('cls' if os.name == 'nt' else 'clear')  # Clear screen
        
        print(f"{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}🚗 REAL-TIME VEHICLE TELEMETRY SIMULATOR")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # Backend status
        try:
            requests.get(f"{API_URL}", timeout=1)
            print(f"{Fore.GREEN}✅ Backend: Connected")
        except:
            print(f"{Fore.RED}❌ Backend: Disconnected")
        
        print(f"\n{Fore.YELLOW}📊 FLEET STATUS")
        print(f"{Fore.YELLOW}{'-'*40}")
        
        # Display each vehicle's current state
        for v_id in VEHICLES[:3]:  # Show first 3 vehicles
            if v_id == vehicle_id:
                # Current vehicle being updated
                if fault_info:
                    print(f"{Fore.RED}▶ {v_id}: {fault_info['name']} ({fault_info['severity']})")
                else:
                    print(f"{Fore.GREEN}▶ {v_id}: Normal Operation")
            else:
                # Other vehicles
                state = self.vehicles[v_id]['current_state']
                if state == 'normal':
                    print(f"{Fore.GREEN}  {v_id}: {state}")
                else:
                    print(f"{Fore.RED}  {v_id}: {state}")
        
        print(f"\n{Fore.YELLOW}📈 CURRENT READING - {vehicle_id}")
        print(f"{Fore.YELLOW}{'-'*40}")
        print(f"Speed:         {data['speed']:.1f} km/h")
        print(f"Engine Temp:   {data['engine_temp']:.1f} °C")
        print(f"RPM:           {data['rpm']:.0f}")
        print(f"Battery:       {data['battery_voltage']:.1f} V")
        print(f"Fuel Level:    {data['fuel_level']:.1f}%")
        
        if result and result['alerts']:
            print(f"\n{Fore.RED}⚠️ ACTIVE ALERTS")
            print(f"{Fore.RED}{'-'*40}")
            for alert in result['alerts']:
                severity_color = {
                    'High': Fore.RED,
                    'Medium': Fore.YELLOW,
                    'Low': Fore.GREEN
                }.get(alert['severity'], Fore.WHITE)
                
                print(f"{severity_color}• {alert['fault_type']}")
                print(f"  Severity: {alert['severity']}, Confidence: {alert['confidence']:.0%}")
        
        print(f"\n{Fore.YELLOW}📊 STATISTICS")
        print(f"{Fore.YELLOW}{'-'*40}")
        print(f"Total Readings: {self.stats['total_readings']}")
        print(f"Total Alerts:    {self.stats['total_alerts']}")
        print(f"Alert Rate:      {(self.stats['total_alerts']/max(1,self.stats['total_readings']))*100:.1f}%")
        
        if self.stats['fault_counts']:
            print(f"\n{Fore.YELLOW}🔍 FAULT BREAKDOWN")
            print(f"{Fore.YELLOW}{'-'*40}")
            for fault, count in sorted(self.stats['fault_counts'].items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"{fault}: {count}")
    
    def simulate_vehicle(self, vehicle_id):
        """Simulate a single vehicle's telemetry"""
        while self.running:
            try:
                # Check if vehicle is in fault state
                if vehicle_id in self.active_faults:
                    fault_info = self.active_faults[vehicle_id]
                    elapsed = time.time() - fault_info['start_time']
                    
                    if elapsed < fault_info['duration']:
                        # Continue fault state
                        data = self.generate_fault_data(fault_info['scenario'])
                        self.vehicles[vehicle_id]['current_state'] = fault_info['scenario']['name']
                    else:
                        # End fault state
                        del self.active_faults[vehicle_id]
                        self.vehicles[vehicle_id]['current_state'] = 'normal'
                        data = self.generate_normal_data()
                else:
                    # Normal operation - check if fault should occur
                    fault = self.select_fault()
                    if fault:
                        # Start new fault
                        duration = random.uniform(*fault['duration'])
                        self.active_faults[vehicle_id] = {
                            'scenario': fault,
                            'start_time': time.time(),
                            'duration': duration
                        }
                        data = self.generate_fault_data(fault)
                        self.vehicles[vehicle_id]['current_state'] = fault['name']
                        self.vehicles[vehicle_id]['current_fault'] = fault
                    else:
                        # Normal data with slight random variation
                        base_data = self.vehicles[vehicle_id]['last_values']
                        data = {
                            'speed': base_data['speed'] + random.uniform(-2, 2),
                            'engine_temp': base_data['engine_temp'] + random.uniform(-0.5, 0.5),
                            'rpm': base_data['rpm'] + random.uniform(-50, 50),
                            'battery_voltage': base_data['battery_voltage'] + random.uniform(-0.1, 0.1),
                            'fuel_level': base_data['fuel_level'] - 0.01  # Slowly decrease fuel
                        }
                        
                        # Ensure values stay within normal ranges
                        for key in NORMAL_RANGES:
                            if key != 'fuel_level':  # Fuel can go below normal range
                                min_val, max_val = NORMAL_RANGES[key]
                                data[key] = max(min_val, min(max_val, data[key]))
                        
                        self.vehicles[vehicle_id]['last_values'] = data
                
                # Send data to backend
                result = self.send_telemetry(vehicle_id, data)
                
                # Update display for this vehicle
                if vehicle_id == VEHICLES[0]:  # Only print for first vehicle to avoid spam
                    fault_info = self.active_faults.get(vehicle_id)
                    self.print_status(vehicle_id, data, result, fault_info)
                
                # Vary update frequency
                time.sleep(random.uniform(0.5, 1.5))
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"{Fore.RED}Error in simulation: {e}")
                time.sleep(2)
    
    def start(self):
        """Start simulation for all vehicles"""
        print(f"{Fore.GREEN}Starting vehicle telemetry simulator...")
        print(f"{Fore.YELLOW}Connecting to backend at {API_URL}")
        
        # Check backend connection
        try:
            requests.get(f"{API_URL}", timeout=2)
            print(f"{Fore.GREEN}✅ Connected to backend successfully!")
        except:
            print(f"{Fore.RED}❌ Cannot connect to backend. Make sure it's running at {API_URL}")
            return
        
        print(f"\n{Fore.CYAN}Simulating {len(VEHICLES)} vehicles:")
        for v in VEHICLES:
            print(f"{Fore.WHITE}  • {v}")
        
        print(f"\n{Fore.YELLOW}Press Ctrl+C to stop\n")
        time.sleep(2)
        
        # Create a thread for each vehicle
        threads = []
        for vehicle_id in VEHICLES:
            thread = threading.Thread(target=self.simulate_vehicle, args=(vehicle_id,))
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        try:
            # Keep main thread running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}Stopping simulator...")
            self.running = False
            time.sleep(1)
            print(f"{Fore.GREEN}Simulator stopped!")
            
            # Print final statistics
            print(f"\n{Fore.CYAN}{'='*60}")
            print(f"{Fore.CYAN}FINAL STATISTICS")
            print(f"{Fore.CYAN}{'='*60}")
            print(f"Total Readings: {self.stats['total_readings']}")
            print(f"Total Alerts:    {self.stats['total_alerts']}")
            print(f"Alert Rate:      {(self.stats['total_alerts']/max(1,self.stats['total_readings']))*100:.1f}%")
            
            if self.stats['fault_counts']:
                print(f"\n{Fore.YELLOW}FAULT BREAKDOWN:")
                for fault, count in sorted(self.stats['fault_counts'].items(), key=lambda x: x[1], reverse=True):
                    print(f"  {fault}: {count}")

if __name__ == "__main__":
    # Install colorama if not present
    try:
        import colorama
    except ImportError:
        print("Installing colorama for colored output...")
        import subprocess
        subprocess.check_call(["pip", "install", "colorama"])
        import colorama
        colorama.init()
    
    simulator = VehicleTelemetrySimulator()
    simulator.start()