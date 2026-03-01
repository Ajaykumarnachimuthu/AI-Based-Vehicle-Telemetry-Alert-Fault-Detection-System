// ==================== CONFIGURATION ====================
const API_URL = 'http://localhost:8000';
let currentVehicle = 'V101';
let autoSimulatorInterval = null;
let audioContext = null;
let isSoundEnabled = true;
let currentHighAlert = null;

// ==================== AUDIO GENERATOR ====================
// Web Audio API - Generates sounds without external files!

// Sound durations for each severity (in milliseconds)
const SOUND_DURATIONS = {
    'high': 4000,    // 4 seconds - continuous pulsing
    'medium': 2000,  // 2 seconds - single beep
    'low': 800       // 0.8 seconds - short chirp
};

// Initialize audio context (requires user interaction)
function initAudio() {
    if (audioContext) return audioContext;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("✅ Audio system ready");
        return audioContext;
    } catch (e) {
        console.log("❌ Web Audio API not supported");
        return null;
    }
}

// Toggle sound on/off
function toggleSound() {
    isSoundEnabled = document.getElementById('soundToggle').checked;
    if (!isSoundEnabled && currentHighAlert) {
        // Stop any playing sound
        try {
            currentHighAlert.stop();
        } catch (e) { }
        currentHighAlert = null;
    }
}

// Main function to play alert sounds
function playAlertSound(severity) {
    if (!isSoundEnabled) return;

    // Initialize audio on first use
    if (!audioContext) {
        audioContext = initAudio();
        if (!audioContext) return;
    }

    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    // Stop any currently playing high alert
    if (currentHighAlert) {
        try {
            currentHighAlert.stop();
        } catch (e) { }
        currentHighAlert = null;
    }

    // Play the appropriate sound
    switch (severity) {
        case 'high':
            playHighAlert();
            break;
        case 'medium':
            playMediumAlert();
            break;
        case 'low':
            playLowAlert();
            break;
    }
}

// HIGH ALERT - 4 seconds (pulsing siren)
function playHighAlert() {
    const ctx = audioContext;
    const duration = SOUND_DURATIONS.high / 1000; // Convert to seconds
    const startTime = ctx.currentTime;

    // Create nodes
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Configure
    oscillator.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    // Connect
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Pulsing siren effect
    const pulseCount = 8; // 8 pulses in 4 seconds
    for (let i = 0; i < pulseCount; i++) {
        const pulseStart = startTime + (i * duration / pulseCount);
        const pulseMid = pulseStart + (duration / pulseCount / 2);
        const pulseEnd = pulseStart + (duration / pulseCount);

        // Frequency sweep (siren effect)
        oscillator.frequency.setValueAtTime(600, pulseStart);
        oscillator.frequency.linearRampToValueAtTime(800, pulseMid);
        oscillator.frequency.linearRampToValueAtTime(600, pulseEnd);

        // Volume envelope (pulsing)
        gainNode.gain.setValueAtTime(0.3, pulseStart);
        gainNode.gain.linearRampToValueAtTime(0.5, pulseMid);
        gainNode.gain.linearRampToValueAtTime(0, pulseEnd);
    }

    // Start and stop
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);

    // Store reference
    currentHighAlert = oscillator;

    // Auto-cleanup
    setTimeout(() => {
        if (currentHighAlert === oscillator) {
            currentHighAlert = null;
        }
    }, duration * 1000);
}

// MEDIUM ALERT - 2 seconds (dual beep)
function playMediumAlert() {
    const ctx = audioContext;
    const duration = SOUND_DURATIONS.medium / 1000;
    const startTime = ctx.currentTime;

    // Two beeps
    for (let beep = 0; beep < 2; beep++) {
        const beepStart = startTime + (beep * 0.8);

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 600;

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Beep envelope
        gainNode.gain.setValueAtTime(0, beepStart);
        gainNode.gain.linearRampToValueAtTime(0.3, beepStart + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, beepStart + 0.3);

        oscillator.start(beepStart);
        oscillator.stop(beepStart + 0.3);
    }
}

// LOW ALERT - 0.8 seconds (soft beep)
function playLowAlert() {
    const ctx = audioContext;
    const duration = SOUND_DURATIONS.low / 1000;
    const startTime = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 400;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Soft envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// ==================== BACKEND CONNECTION ====================

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    checkBackendStatus();
    loadVehicleData();
    updateLiveParams();

    // Initialize audio on first user interaction
    document.body.addEventListener('click', function initAudioOnFirstClick() {
        initAudio();
        document.body.removeEventListener('click', initAudioOnFirstClick);
    }, { once: true });

    // Start real-time updates
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadVehicleData();
        }
    }, 2000);
});

// Check backend connection
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_URL}/`);
        if (response.ok) {
            document.getElementById('backendStatus').className = 'status-indicator connected';
            document.getElementById('statusText').textContent = 'Connected';
        }
    } catch (error) {
        document.getElementById('backendStatus').className = 'status-indicator';
        document.getElementById('statusText').textContent = 'Disconnected';
    }
}

// Update live parameters from sliders
function updateLiveParams() {
    const speed = document.getElementById('speed').value;
    const temp = document.getElementById('engineTemp').value;
    const rpm = document.getElementById('rpm').value;
    const battery = document.getElementById('battery').value;
    const fuel = document.getElementById('fuel').value;

    // Update displayed values
    document.getElementById('speedVal').textContent = speed;
    document.getElementById('tempVal').textContent = temp;
    document.getElementById('rpmVal').textContent = rpm;
    document.getElementById('batteryVal').textContent = battery;
    document.getElementById('fuelVal').textContent = fuel;

    // Update live display
    document.getElementById('liveSpeed').textContent = speed + ' km/h';
    document.getElementById('liveTemp').textContent = temp + '°C';
    document.getElementById('liveRPM').textContent = rpm;
    document.getElementById('liveBattery').textContent = battery + 'V';
    document.getElementById('liveFuel').textContent = fuel + '%';

    // Update progress bars
    document.getElementById('speedBar').style.width = (speed / 200 * 100) + '%';
    document.getElementById('tempBar').style.width = (temp / 150 * 100) + '%';
    document.getElementById('rpmBar').style.width = (rpm / 10000 * 100) + '%';
    document.getElementById('batteryBar').style.width = (battery / 24 * 100) + '%';
    document.getElementById('fuelBar').style.width = fuel + '%';

    // Update car animation speed
    const carAnim = document.getElementById('carAnimation');
    if (speed > 120) {
        carAnim.classList.add('fast');
    } else {
        carAnim.classList.remove('fast');
    }
}

// Send telemetry data
async function sendTelemetry() {
    const vehicleId = document.getElementById('vehicleSelect').value;

    const data = {
        vehicle_id: vehicleId,
        speed: parseFloat(document.getElementById('speed').value),
        engine_temp: parseFloat(document.getElementById('engineTemp').value),
        rpm: parseFloat(document.getElementById('rpm').value),
        battery_voltage: parseFloat(document.getElementById('battery').value),
        fuel_level: parseFloat(document.getElementById('fuel').value),
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_URL}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            handleDetectionResult(result);
        }
    } catch (error) {
        console.log('Failed to send data');
    }
}

// Handle detection result
function handleDetectionResult(result) {
    if (result.alerts && result.alerts.length > 0) {
        const highestSeverity = getHighestSeverity(result.alerts);
        updateVehicleStatus(highestSeverity, result.alerts[0]);

        // Add to alert history
        result.alerts.forEach(alert => addToAlertHistory(alert));

        // Play sound based on severity
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
    const vehicleAnim = document.getElementById('carAnimation');

    // Reset all LEDs
    ledGreen.classList.remove('active');
    ledYellow.classList.remove('active');
    ledRed.classList.remove('active');

    // Stop car animation on high severity
    if (severity === 'High') {
        vehicleAnim.classList.add('paused');
    } else {
        vehicleAnim.classList.remove('paused');
    }

    // Set appropriate LED and badge
    switch (severity) {
        case 'High':
            ledRed.classList.add('active');
            statusBadge.className = 'status-badge danger';
            statusBadge.textContent = `DANGER: ${alert.fault_type}`;
            break;
        case 'Medium':
            ledYellow.classList.add('active');
            statusBadge.className = 'status-badge warning';
            statusBadge.textContent = `WARNING: ${alert.fault_type}`;
            break;
        case 'Low':
            ledYellow.classList.add('active');
            statusBadge.className = 'status-badge warning';
            statusBadge.textContent = `CAUTION: ${alert.fault_type}`;
            break;
    }
}

// Set normal status (green)
function setNormalStatus() {
    document.getElementById('ledGreen').classList.add('active');
    document.getElementById('ledYellow').classList.remove('active');
    document.getElementById('ledRed').classList.remove('active');

    const statusBadge = document.querySelector('.status-badge');
    statusBadge.className = 'status-badge normal';
    statusBadge.textContent = 'NORMAL';

    document.getElementById('carAnimation').classList.remove('paused');
}

// Show alert banner
function showAlertBanner(alert) {
    const banner = document.getElementById('alertBanner');
    const message = document.getElementById('alertMessage');

    message.textContent = `⚠️ HIGH SEVERITY: ${alert.fault_type}`;
    banner.style.display = 'flex';
}

// Dismiss alert banner
function dismissAlert() {
    document.getElementById('alertBanner').style.display = 'none';

    // Stop high alert sound
    if (currentHighAlert) {
        try {
            currentHighAlert.stop();
        } catch (e) { }
        currentHighAlert = null;
    }
}

// Add alert to history
function addToAlertHistory(alert) {
    const alertList = document.getElementById('alertList');
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${alert.severity.toLowerCase()}`;

    const time = new Date().toLocaleTimeString();

    alertItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <strong>${alert.fault_type}</strong>
            <span>${alert.severity}</span>
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
    if (alertList.children.length > 50) {
        alertList.removeChild(alertList.lastChild);
    }
}

// Filter alerts
function filterAlerts() {
    const filter = document.getElementById('alertFilter').value;
    const alerts = document.querySelectorAll('.alert-item');

    alerts.forEach(alert => {
        if (filter === 'all') {
            alert.style.display = 'block';
        } else {
            if (alert.classList.contains(filter.toLowerCase())) {
                alert.style.display = 'block';
            } else {
                alert.style.display = 'none';
            }
        }
    });
}

// Clear all alerts
function clearAlerts() {
    document.getElementById('alertList').innerHTML = '';
}

// Trigger specific fault
function triggerFault(faultType) {
    const faultValues = {
        'overheat': { temp: 118, speed: 80, rpm: 3200, battery: 12.3, fuel: 60 },
        'overspeed': { speed: 155, temp: 95, rpm: 4500, battery: 12.4, fuel: 50 },
        'battery': { battery: 9.8, speed: 45, temp: 82, rpm: 1800, fuel: 40 },
        'rpm': { rpm: 7200, speed: 110, temp: 105, battery: 12.1, fuel: 30 },
        'fuel': { fuel: 5, speed: 70, temp: 88, rpm: 2500, battery: 12.5 }
    };

    const values = faultValues[faultType];

    // Update sliders
    document.getElementById('speed').value = values.speed || 85;
    document.getElementById('engineTemp').value = values.temp || 92;
    document.getElementById('rpm').value = values.rpm || 2800;
    document.getElementById('battery').value = values.battery || 12.4;
    document.getElementById('fuel').value = values.fuel || 45;

    updateLiveParams();
    sendTelemetry();
}

// Reset to normal values
function resetToNormal() {
    document.getElementById('speed').value = 65;
    document.getElementById('engineTemp').value = 85;
    document.getElementById('rpm').value = 2500;
    document.getElementById('battery').value = 12.6;
    document.getElementById('fuel').value = 75;

    updateLiveParams();
    sendTelemetry();
}

// Start auto simulator
function startAutoSimulator() {
    if (autoSimulatorInterval) return;

    const prob = parseFloat(document.getElementById('simProb').value);

    autoSimulatorInterval = setInterval(() => {
        if (Math.random() < prob) {
            const faults = ['overheat', 'overspeed', 'battery', 'rpm', 'fuel'];
            const randomFault = faults[Math.floor(Math.random() * faults.length)];
            triggerFault(randomFault);
        } else {
            resetToNormal();
        }
    }, 3000);
}

// Stop auto simulator
function stopAutoSimulator() {
    if (autoSimulatorInterval) {
        clearInterval(autoSimulatorInterval);
        autoSimulatorInterval = null;
    }
}

// Load vehicle data
async function loadVehicleData() {
    const vehicleId = document.getElementById('vehicleSelect').value;

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
        console.log('No recent data');
    }
}

// Update from latest data
function updateFromLatest(data) {
    document.getElementById('liveSpeed').textContent = data.speed + ' km/h';
    document.getElementById('liveTemp').textContent = data.engine_temp + '°C';
    document.getElementById('liveRPM').textContent = data.rpm;
    document.getElementById('liveBattery').textContent = data.battery_voltage + 'V';
    document.getElementById('liveFuel').textContent = data.fuel_level + '%';
}

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
}

// Vehicle change handler
document.getElementById('vehicleSelect').addEventListener('change', (e) => {
    currentVehicle = e.target.value;
    loadVehicleData();
});