// ==================== CONFIGURATION ====================
const API_URL = 'https://vehicle-telemetry-api.onrender.com';
let audioContext = null;
let isSoundEnabled = true;
let currentHighAlert = null;
let animationFrame = null;
let autoSimulatorInterval = null;

// ==================== SAMPLE DATA (MATCHING PYTHON BACKEND) ====================

// Vehicle fleet (matching Python backend)
const VEHICLES = [
    { id: "V101", name: "Tesla Model 3", type: "Electric" },
    { id: "V102", name: "Ford F-150", type: "Petrol" },
    { id: "V103", name: "Toyota Camry", type: "Hybrid" },
    { id: "V104", name: "BMW X5", type: "Diesel" },
    { id: "V105", name: "Mercedes Sprinter", type: "Diesel" }
];

// Normal operating ranges (from Python NORMAL_RANGES)
const NORMAL_RANGES = {
    speed: { min: 40, max: 80, warning: 120, critical: 140 },
    engineTemp: { min: 75, max: 95, warning: 100, critical: 115 },
    rpm: { min: 1500, max: 3500, warning: 6000, critical: 7000 },
    battery: { min: 11.8, max: 13.2, warning: 11.0, critical: 10.0 },
    fuel: { min: 20, max: 90, warning: 10, critical: 5 }
};

// Ideal normal values (from Python IDEAL_NORMAL)
const IDEAL_NORMAL = {
    speed: 65,
    engineTemp: 85,
    rpm: 2500,
    battery: 12.6,
    fuel: 75
};

// FAULT SCENARIOS - EXACTLY matching Python backend
const FAULT_SCENARIOS = {
    overheat: {
        name: 'Engine Overheat',
        severity: 'High',
        values: {
            speed: 80,
            engineTemp: 118,
            rpm: 3200,
            battery: 12.3,
            fuel: 60
        },
        description: 'Cooling system failure - Immediate action required'
    },
    overspeed: {
        name: 'Overspeed',
        severity: 'High',
        values: {
            speed: 155,
            engineTemp: 95,
            rpm: 4500,
            battery: 12.4,
            fuel: 50
        },
        description: 'Vehicle exceeding safe speed limits'
    },
    battery: {
        name: 'Battery Failure',
        severity: 'High',
        values: {
            speed: 45,
            engineTemp: 82,
            rpm: 1800,
            battery: 9.8,
            fuel: 40
        },
        description: 'Critical battery voltage drop'
    },
    rpm: {
        name: 'Engine Stress',
        severity: 'Medium',
        values: {
            speed: 110,
            engineTemp: 105,
            rpm: 7200,
            battery: 12.1,
            fuel: 30
        },
        description: 'Engine running at dangerously high RPM'
    },
    fuel: {
        name: 'Low Fuel',
        severity: 'Medium',
        values: {
            speed: 70,
            engineTemp: 88,
            rpm: 2500,
            battery: 12.5,
            fuel: 5
        },
        description: 'Fuel level critically low'
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Initializing Vehicle Telemetry System...");
    initializeUI();
    checkBackendStatus();
    setupSliders();
    loadVehicleData();

    // Initialize audio on first click (browser requirement)
    document.body.addEventListener('click', function initAudioOnce() {
        initAudio();
        document.body.removeEventListener('click', initAudioOnce);
    }, { once: true });

    // Start real-time updates
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadVehicleData();
        }
    }, 2000);
});

// Initialize UI elements
function initializeUI() {
    console.log("🎨 Initializing UI...");
    updateSliderStyles();
    setNormalStatus();
    populateVehicleSelect();
}

// Populate vehicle dropdown
function populateVehicleSelect() {
    const select = document.getElementById('vehicleSelect');
    if (select) {
        select.innerHTML = VEHICLES.map(v =>
            `<option value="${v.id}">🚗 ${v.name} (${v.type})</option>`
        ).join('');
        console.log(`✅ Loaded ${VEHICLES.length} vehicles`);
    }
}

// Setup smooth slider updates
function setupSliders() {
    const sliders = ['speed', 'temp', 'rpm', 'battery', 'fuel'];

    sliders.forEach(slider => {
        const element = document.getElementById(`${slider}Slider`);
        if (element) {
            // Set initial values
            if (slider === 'speed') element.value = IDEAL_NORMAL.speed;
            if (slider === 'temp') element.value = IDEAL_NORMAL.engineTemp;
            if (slider === 'rpm') element.value = IDEAL_NORMAL.rpm;
            if (slider === 'battery') element.value = IDEAL_NORMAL.battery;
            if (slider === 'fuel') element.value = IDEAL_NORMAL.fuel;

            element.addEventListener('input', (e) => {
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                animationFrame = requestAnimationFrame(() => {
                    updateFromSliders();
                    updateSliderStyle(e.target);
                    animationFrame = null;
                });
            });
        }
    });

    // Initial update
    updateFromSliders();
}

// Update slider background gradient
function updateSliderStyle(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const value = parseFloat(slider.value);
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--value', `${percentage}%`);
}

// Update all slider styles
function updateSliderStyles() {
    document.querySelectorAll('.smooth-slider').forEach(updateSliderStyle);
}

// Update all displays from slider values
function updateFromSliders() {
    // Get slider elements
    const speedSlider = document.getElementById('speedSlider');
    const tempSlider = document.getElementById('tempSlider');
    const rpmSlider = document.getElementById('rpmSlider');
    const batterySlider = document.getElementById('batterySlider');
    const fuelSlider = document.getElementById('fuelSlider');

    if (!speedSlider || !tempSlider || !rpmSlider || !batterySlider || !fuelSlider) return;

    const speed = parseFloat(speedSlider.value);
    const temp = parseFloat(tempSlider.value);
    const rpm = parseFloat(rpmSlider.value);
    const battery = parseFloat(batterySlider.value);
    const fuel = parseFloat(fuelSlider.value);

    // Update value displays
    const speedValue = document.getElementById('speedValue');
    const tempValue = document.getElementById('tempValue');
    const rpmValue = document.getElementById('rpmValue');
    const batteryValue = document.getElementById('batteryValue');
    const fuelValue = document.getElementById('fuelValue');

    if (speedValue) speedValue.textContent = `${speed} km/h`;
    if (tempValue) tempValue.textContent = `${temp} °C`;
    if (rpmValue) rpmValue.textContent = rpm;
    if (batteryValue) batteryValue.textContent = `${battery.toFixed(1)} V`;
    if (fuelValue) fuelValue.textContent = `${fuel} %`;

    // Update gauges
    const gaugeSpeed = document.getElementById('gaugeSpeed');
    const gaugeTemp = document.getElementById('gaugeTemp');
    const gaugeRPM = document.getElementById('gaugeRPM');
    const gaugeBattery = document.getElementById('gaugeBattery');
    const gaugeFuel = document.getElementById('gaugeFuel');

    if (gaugeSpeed) gaugeSpeed.textContent = speed;
    if (gaugeTemp) gaugeTemp.textContent = temp;
    if (gaugeRPM) gaugeRPM.textContent = Math.round(rpm / 100) / 10;
    if (gaugeBattery) gaugeBattery.textContent = battery.toFixed(1);
    if (gaugeFuel) gaugeFuel.textContent = fuel;

    // Update progress bars
    const progressSpeed = document.getElementById('progressSpeed');
    const progressTemp = document.getElementById('progressTemp');
    const progressRPM = document.getElementById('progressRPM');
    const progressBattery = document.getElementById('progressBattery');
    const progressFuel = document.getElementById('progressFuel');

    if (progressSpeed) progressSpeed.style.width = `${(speed / 200) * 100}%`;
    if (progressTemp) progressTemp.style.width = `${(temp / 150) * 100}%`;
    if (progressRPM) progressRPM.style.width = `${(rpm / 8000) * 100}%`;
    if (progressBattery) progressBattery.style.width = `${((battery - 8) / 7) * 100}%`;
    if (progressFuel) progressFuel.style.width = `${fuel}%`;

    // Update car animation speed
    const carModel = document.getElementById('carModel');
    if (carModel) {
        if (speed > 120) {
            carModel.classList.add('fast');
        } else {
            carModel.classList.remove('fast');
        }
    }

    // Update road animation speed
    const roadLines = document.getElementById('roadLines');
    if (roadLines) {
        roadLines.style.animationDuration = `${Math.max(0.3, 2 - speed / 100)}s`;
    }
}

// ==================== AUDIO GENERATOR (FIXED WORKING VERSION) ====================

function initAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("✅ Audio system initialized successfully");

            // Create a silent buffer to unlock audio on iOS
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        }
    } catch (e) {
        console.log("❌ Audio not supported:", e);
    }
}

function toggleSound() {
    const soundToggle = document.getElementById('soundToggle');
    isSoundEnabled = soundToggle ? soundToggle.checked : true;
    console.log(`🔊 Sound ${isSoundEnabled ? 'enabled' : 'disabled'}`);

    if (!isSoundEnabled && currentHighAlert) {
        try {
            currentHighAlert.stop();
        } catch (e) { }
        currentHighAlert = null;
    }
}

// Simple beep function that definitely works
function beep(frequency, duration, volume, type = 'sine') {
    if (!isSoundEnabled) return;

    try {
        // Initialize audio if needed
        if (!audioContext) {
            initAudio();
            if (!audioContext) return;
        }

        // Resume if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);

        return oscillator;
    } catch (e) {
        console.log("🔇 Audio error:", e);
    }
}

// Play alert sound based on severity
function playAlertSound(severity) {
    if (!isSoundEnabled) return;

    console.log(`🔊 Playing ${severity} alert sound`);

    switch (severity) {
        case 'High':
            // High alert - 4 seconds: alternating frequencies
            beep(800, 0.4, 0.3, 'sawtooth');
            setTimeout(() => beep(1000, 0.4, 0.3, 'sawtooth'), 400);
            setTimeout(() => beep(800, 0.4, 0.3, 'sawtooth'), 800);
            setTimeout(() => beep(1000, 0.4, 0.3, 'sawtooth'), 1200);
            setTimeout(() => beep(800, 0.4, 0.3, 'sawtooth'), 1600);
            setTimeout(() => beep(1000, 0.4, 0.3, 'sawtooth'), 2000);
            setTimeout(() => beep(800, 0.4, 0.3, 'sawtooth'), 2400);
            setTimeout(() => beep(1000, 0.4, 0.3, 'sawtooth'), 2800);
            setTimeout(() => beep(800, 0.4, 0.3, 'sawtooth'), 3200);
            setTimeout(() => beep(1000, 0.4, 0.3, 'sawtooth'), 3600);
            break;

        case 'Medium':
            // Medium alert - 2 seconds: dual beep
            beep(600, 0.3, 0.2);
            setTimeout(() => beep(600, 0.3, 0.2), 500);
            setTimeout(() => beep(600, 0.3, 0.2), 1000);
            setTimeout(() => beep(600, 0.3, 0.2), 1500);
            break;

        case 'Low':
            // Low alert - 1 second: single soft beep
            beep(400, 0.2, 0.1);
            break;
    }
}

// ==================== BACKEND CONNECTION ====================

// Check backend connection
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_URL}/`, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' }
        });

        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (response.ok) {
            if (statusDot) {
                statusDot.className = 'status-dot connected';
                statusDot.classList.add('connected');
            }
            if (statusText) statusText.textContent = 'Connected';
            console.log("✅ Backend connected");
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (statusDot) {
            statusDot.className = 'status-dot';
            statusDot.classList.remove('connected');
        }
        if (statusText) statusText.textContent = 'Disconnected';
        console.log("❌ Backend disconnected");
    }
}

// Send telemetry data
async function sendTelemetry() {
    const vehicleSelect = document.getElementById('vehicleSelect');
    const vehicleId = vehicleSelect ? vehicleSelect.value : 'V101';

    const data = {
        vehicle_id: vehicleId,
        speed: parseFloat(document.getElementById('speedSlider')?.value || 65),
        engine_temp: parseFloat(document.getElementById('tempSlider')?.value || 85),
        rpm: parseFloat(document.getElementById('rpmSlider')?.value || 2500),
        battery_voltage: parseFloat(document.getElementById('batterySlider')?.value || 12.6),
        fuel_level: parseFloat(document.getElementById('fuelSlider')?.value || 75),
        timestamp: new Date().toISOString()
    };

    console.log("📤 Sending data:", data);

    try {
        const response = await fetch(`${API_URL}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log("📥 Response:", result);
            handleDetectionResult(result);
        } else {
            console.log("❌ Send failed:", response.status);
        }
    } catch (error) {
        console.log("❌ Error sending data:", error);
    }
}

// Handle detection result
function handleDetectionResult(result) {
    if (result.alerts && result.alerts.length > 0) {
        const highestSeverity = getHighestSeverity(result.alerts);
        console.log(`⚠️ Alert detected: ${highestSeverity} severity`);

        updateVehicleStatus(highestSeverity, result.alerts[0]);
        result.alerts.forEach(alert => addToAlertHistory(alert));

        // Play sound
        playAlertSound(highestSeverity);

        // Show banner for high severity
        if (highestSeverity === 'High') {
            showAlertBanner(result.alerts[0]);
        }
    } else {
        setNormalStatus();
    }
}

// Get highest severity from alerts
function getHighestSeverity(alerts) {
    const severityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return alerts.reduce((max, alert) =>
        severityOrder[alert.severity] > severityOrder[max] ? alert.severity : max, 'Low'
    );
}

// Update vehicle status indicators
function updateVehicleStatus(severity, alert) {
    const ledGreen = document.getElementById('ledGreen');
    const ledYellow = document.getElementById('ledYellow');
    const ledRed = document.getElementById('ledRed');
    const statusBadge = document.querySelector('.status-badge');
    const carModel = document.getElementById('carModel');

    // Reset all LEDs
    if (ledGreen) ledGreen.classList.remove('active');
    if (ledYellow) ledYellow.classList.remove('active');
    if (ledRed) ledRed.classList.remove('active');

    // Stop car animation on high severity
    if (carModel) {
        if (severity === 'High') {
            carModel.classList.add('paused');
        } else {
            carModel.classList.remove('paused');
        }
    }

    // Set appropriate LED and badge
    switch (severity) {
        case 'High':
            if (ledRed) ledRed.classList.add('active');
            if (statusBadge) {
                statusBadge.className = 'status-badge danger';
                statusBadge.textContent = `DANGER: ${alert.fault_type}`;
            }
            break;
        case 'Medium':
            if (ledYellow) ledYellow.classList.add('active');
            if (statusBadge) {
                statusBadge.className = 'status-badge warning';
                statusBadge.textContent = `WARNING: ${alert.fault_type}`;
            }
            break;
        case 'Low':
            if (ledYellow) ledYellow.classList.add('active');
            if (statusBadge) {
                statusBadge.className = 'status-badge warning';
                statusBadge.textContent = `CAUTION: ${alert.fault_type}`;
            }
            break;
    }
}

// Set normal status (green)
function setNormalStatus() {
    const ledGreen = document.getElementById('ledGreen');
    const ledYellow = document.getElementById('ledYellow');
    const ledRed = document.getElementById('ledRed');
    const statusBadge = document.querySelector('.status-badge');
    const carModel = document.getElementById('carModel');

    if (ledGreen) ledGreen.classList.add('active');
    if (ledYellow) ledYellow.classList.remove('active');
    if (ledRed) ledRed.classList.remove('active');

    if (statusBadge) {
        statusBadge.className = 'status-badge normal';
        statusBadge.textContent = 'NORMAL';
    }

    if (carModel) carModel.classList.remove('paused');
}

// Show alert banner
function showAlertBanner(alert) {
    const banner = document.getElementById('alertBanner');
    const message = document.getElementById('bannerMessage');

    if (!banner || !message) return;

    message.textContent = `⚠️ HIGH SEVERITY: ${alert.fault_type} - ${alert.description || ''}`;
    banner.style.display = 'flex';

    // Auto hide after 8 seconds
    setTimeout(() => {
        banner.style.display = 'none';
    }, 8000);
}

// Dismiss alert banner
function dismissBanner() {
    const banner = document.getElementById('alertBanner');
    if (banner) banner.style.display = 'none';
}

// Add alert to history
function addToAlertHistory(alert) {
    const alertList = document.getElementById('alertList');
    if (!alertList) return;

    // Remove placeholder if exists
    const placeholder = alertList.querySelector('.alert-placeholder');
    if (placeholder) placeholder.remove();

    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${alert.severity}`;

    const time = new Date().toLocaleTimeString();

    alertItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <strong>${alert.fault_type}</strong>
            <span style="font-weight: bold;">${alert.severity}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
            <span>Vehicle: ${alert.vehicle_id}</span>
            <span>${time}</span>
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 5px;">
            Confidence: ${(alert.confidence * 100).toFixed(0)}%
        </div>
    `;

    alertList.insertBefore(alertItem, alertList.firstChild);

    // Limit history to 50 items
    while (alertList.children.length > 50) {
        alertList.removeChild(alertList.lastChild);
    }
}

// Filter alerts
function filterAlerts(severity) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === severity) {
            btn.classList.add('active');
        }
    });

    const alerts = document.querySelectorAll('.alert-item');

    alerts.forEach(alert => {
        if (severity === 'all') {
            alert.style.display = 'block';
        } else {
            if (alert.classList.contains(severity)) {
                alert.style.display = 'block';
            } else {
                alert.style.display = 'none';
            }
        }
    });
}

// Clear all alerts
function clearAlerts() {
    const alertList = document.getElementById('alertList');
    if (alertList) {
        alertList.innerHTML = `
            <div class="alert-placeholder">
                <i class="fas fa-bell"></i>
                <p>No alerts yet</p>
            </div>
        `;
    }
}

// Trigger specific fault
function triggerFault(faultType) {
    console.log(`⚠️ Triggering fault: ${faultType}`);

    const scenario = FAULT_SCENARIOS[faultType];
    if (!scenario) return;

    const values = scenario.values;

    // Update sliders
    const speedSlider = document.getElementById('speedSlider');
    const tempSlider = document.getElementById('tempSlider');
    const rpmSlider = document.getElementById('rpmSlider');
    const batterySlider = document.getElementById('batterySlider');
    const fuelSlider = document.getElementById('fuelSlider');

    if (speedSlider) speedSlider.value = values.speed;
    if (tempSlider) tempSlider.value = values.engineTemp;
    if (rpmSlider) rpmSlider.value = values.rpm;
    if (batterySlider) batterySlider.value = values.battery;
    if (fuelSlider) fuelSlider.value = values.fuel;

    updateSliderStyles();
    updateFromSliders();
    sendTelemetry();

    // Play sound immediately for demo
    playAlertSound(scenario.severity);

    // Show banner for high severity
    if (scenario.severity === 'High') {
        showAlertBanner({
            fault_type: scenario.name,
            severity: scenario.severity,
            description: scenario.description,
            vehicle_id: document.getElementById('vehicleSelect')?.value || 'V101',
            confidence: 0.95
        });
    }
}

// Reset to normal values
function resetToNormal() {
    console.log("🔄 Resetting to normal");

    const speedSlider = document.getElementById('speedSlider');
    const tempSlider = document.getElementById('tempSlider');
    const rpmSlider = document.getElementById('rpmSlider');
    const batterySlider = document.getElementById('batterySlider');
    const fuelSlider = document.getElementById('fuelSlider');

    if (speedSlider) speedSlider.value = IDEAL_NORMAL.speed;
    if (tempSlider) tempSlider.value = IDEAL_NORMAL.engineTemp;
    if (rpmSlider) rpmSlider.value = IDEAL_NORMAL.rpm;
    if (batterySlider) batterySlider.value = IDEAL_NORMAL.battery;
    if (fuelSlider) fuelSlider.value = IDEAL_NORMAL.fuel;

    updateSliderStyles();
    updateFromSliders();
    sendTelemetry();
    setNormalStatus();
}

// Start auto simulator
function startAutoSimulator() {
    if (autoSimulatorInterval) {
        clearInterval(autoSimulatorInterval);
        autoSimulatorInterval = null;
    }

    console.log("▶️ Starting auto simulator");

    autoSimulatorInterval = setInterval(() => {
        // 20% chance of fault
        if (Math.random() < 0.2) {
            const faults = ['overheat', 'overspeed', 'battery', 'rpm', 'fuel'];
            const randomFault = faults[Math.floor(Math.random() * faults.length)];
            triggerFault(randomFault);
        } else {
            resetToNormal();
        }
    }, 5000);
}

// Stop auto simulator
function stopAutoSimulator() {
    if (autoSimulatorInterval) {
        clearInterval(autoSimulatorInterval);
        autoSimulatorInterval = null;
        console.log("⏹️ Stopped auto simulator");
    }
}

// Load vehicle data from backend
async function loadVehicleData() {
    const vehicleSelect = document.getElementById('vehicleSelect');
    if (!vehicleSelect) return;

    const vehicleId = vehicleSelect.value;

    try {
        const response = await fetch(`${API_URL}/vehicle/${vehicleId}/recent?limit=1`);
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                const latest = data.data[0];
                updateFromLatest(latest);
            }
        }
    } catch (error) {
        // Silent fail - just use local data
    }
}

// Update from latest backend data
function updateFromLatest(data) {
    const gaugeSpeed = document.getElementById('gaugeSpeed');
    const gaugeTemp = document.getElementById('gaugeTemp');
    const gaugeRPM = document.getElementById('gaugeRPM');
    const gaugeBattery = document.getElementById('gaugeBattery');
    const gaugeFuel = document.getElementById('gaugeFuel');

    if (gaugeSpeed) gaugeSpeed.textContent = data.speed;
    if (gaugeTemp) gaugeTemp.textContent = data.engine_temp;
    if (gaugeRPM) gaugeRPM.textContent = Math.round(data.rpm / 100) / 10;
    if (gaugeBattery) gaugeBattery.textContent = data.battery_voltage.toFixed(1);
    if (gaugeFuel) gaugeFuel.textContent = data.fuel_level;
}

// Tab switching
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(tabName)) {
            btn.classList.add('active');
        }
    });

    panes.forEach(pane => {
        pane.classList.remove('active');
    });

    const activePane = document.getElementById(`${tabName}-tab`);
    if (activePane) activePane.classList.add('active');
}

// Make functions globally available
window.updateFromSliders = updateFromSliders;
window.sendTelemetry = sendTelemetry;
window.triggerFault = triggerFault;
window.resetToNormal = resetToNormal;
window.startAutoSimulator = startAutoSimulator;
window.stopAutoSimulator = stopAutoSimulator;
window.filterAlerts = filterAlerts;
window.clearAlerts = clearAlerts;
window.dismissBanner = dismissBanner;
window.toggleSound = toggleSound;
window.showTab = showTab;