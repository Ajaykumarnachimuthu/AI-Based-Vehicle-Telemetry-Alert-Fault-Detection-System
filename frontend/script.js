// API Configuration
const API_URL = 'http://localhost:8000';

// Global variables
let autoRefreshInterval;
let simulationInterval;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkBackendStatus();
    loadDashboardStats();
    loadRecentTelemetry();
    loadAlerts();

    // Set up auto-refresh
    startAutoRefresh();
});

// Check backend connection
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_URL}/`);
        if (response.ok) {
            document.getElementById('backendStatus').className = 'status-indicator connected';
            document.getElementById('statusText').textContent = 'Backend Connected';
            showToast('Backend connected successfully', 'success');
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        document.getElementById('backendStatus').className = 'status-indicator disconnected';
        document.getElementById('statusText').textContent = 'Backend Disconnected';
        showToast('Cannot connect to backend', 'error');
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/dashboard/stats`);
        const data = await response.json();

        document.getElementById('totalAlerts').textContent = data.total_alerts || 0;
        document.getElementById('activeVehicles').textContent = data.active_vehicles || 0;
        document.getElementById('highCount').textContent = data.severity_distribution?.High || 0;
        document.getElementById('mediumCount').textContent = data.severity_distribution?.Medium || 0;
        document.getElementById('lowCount').textContent = data.severity_distribution?.Low || 0;

        updateCharts(data);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent telemetry
async function loadRecentTelemetry() {
    const vehicleId = document.getElementById('vehicleId').value;

    try {
        const response = await fetch(`${API_URL}/vehicle/${vehicleId}/recent?limit=10`);
        const data = await response.json();

        const tbody = document.getElementById('recentDataBody');

        if (data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(item => `
                <tr>
                    <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
                    <td>${item.speed} km/h</td>
                    <td>${item.engine_temp}°C</td>
                    <td>${item.rpm}</td>
                    <td>${item.battery_voltage}V</td>
                    <td>${item.fuel_level}%</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No data available</td></tr>';
        }
    } catch (error) {
        console.error('Error loading telemetry:', error);
    }
}

// Load alerts
async function loadAlerts() {
    const severity = document.getElementById('severityFilter').value;
    const url = severity === 'All'
        ? `${API_URL}/alerts?limit=50`
        : `${API_URL}/alerts?severity=${severity}&limit=50`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const alertsList = document.getElementById('alertsList');

        if (data.alerts && data.alerts.length > 0) {
            alertsList.innerHTML = data.alerts.map(alert => `
                <div class="alert-item ${alert.severity.toLowerCase()}">
                    <div class="alert-header">
                        <span class="alert-type">${alert.fault_type}</span>
                        <span class="alert-severity ${alert.severity.toLowerCase()}">${alert.severity}</span>
                    </div>
                    <div class="alert-body">
                        <span>Vehicle: ${alert.vehicle_id}</span>
                        <span class="alert-confidence">Confidence: ${(alert.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
            `).join('');
        } else {
            alertsList.innerHTML = '<div class="no-data">No alerts found</div>';
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Send telemetry data
async function sendTelemetry() {
    const vehicleId = document.getElementById('vehicleId').value;

    const data = {
        vehicle_id: vehicleId,
        speed: parseFloat(document.getElementById('speedVal').value),
        engine_temp: parseFloat(document.getElementById('engineTempVal').value),
        rpm: parseFloat(document.getElementById('rpmVal').value),
        battery_voltage: parseFloat(document.getElementById('batteryVal').value),
        fuel_level: parseFloat(document.getElementById('fuelVal').value),
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`${API_URL}/ingest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.alerts && result.alerts.length > 0) {
            showToast(`${result.alerts.length} alert(s) generated!`, 'warning');
            result.alerts.forEach(alert => {
                console.log('Alert:', alert);
            });
        } else {
            showToast('Data sent successfully - No alerts', 'success');
        }

        // Refresh data
        loadRecentTelemetry();
        loadAlerts();
        loadDashboardStats();
    } catch (error) {
        console.error('Error sending telemetry:', error);
        showToast('Failed to send telemetry data', 'error');
    }
}

// Start simulation
async function startSimulation() {
    const vehicleId = document.getElementById('simVehicleId').value;
    const probability = parseFloat(document.getElementById('anomalyProbVal').value);
    const duration = parseInt(document.getElementById('simDuration').value);

    const output = document.getElementById('simulationOutput');
    output.innerHTML = '<div class="spinner"></div>';

    const steps = duration;
    let step = 0;

    if (simulationInterval) {
        clearInterval(simulationInterval);
    }

    simulationInterval = setInterval(async () => {
        step++;

        // Generate random data with anomaly probability
        const isAnomaly = Math.random() < probability;

        let data;
        if (isAnomaly) {
            data = {
                vehicle_id: vehicleId,
                speed: 130 + Math.random() * 50,
                engine_temp: 105 + Math.random() * 25,
                rpm: 6500 + Math.random() * 2000,
                battery_voltage: 8 + Math.random() * 3,
                fuel_level: Math.random() * 10,
                timestamp: new Date().toISOString()
            };
        } else {
            data = {
                vehicle_id: vehicleId,
                speed: 40 + Math.random() * 60,
                engine_temp: 75 + Math.random() * 20,
                rpm: 1500 + Math.random() * 2000,
                battery_voltage: 11.5 + Math.random() * 2,
                fuel_level: 20 + Math.random() * 70,
                timestamp: new Date().toISOString()
            };
        }

        try {
            const response = await fetch(`${API_URL}/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            const logEntry = document.createElement('div');
            logEntry.className = `sim-log ${isAnomaly ? 'anomaly' : ''}`;
            logEntry.textContent = `Step ${step}: Sent ${isAnomaly ? '⚠️ ANOMALY' : '✓ normal'} data - ${result.alerts.length} alerts`;

            output.appendChild(logEntry);
            output.scrollTop = output.scrollHeight;

            if (step >= steps) {
                clearInterval(simulationInterval);
                output.appendChild(document.createElement('div')).textContent = '✅ Simulation complete!';
            }

            // Refresh data
            loadRecentTelemetry();
            loadAlerts();
            loadDashboardStats();
        } catch (error) {
            console.error('Simulation error:', error);
        }
    }, 1000);
}

// Load test case
function loadTestCase(type) {
    const testCases = {
        normal: { speed: 65, engineTemp: 85, rpm: 2500, battery: 12.6, fuel: 75 },
        overheat: { speed: 80, engineTemp: 118, rpm: 3200, battery: 12.3, fuel: 60 },
        overspeed: { speed: 155, engineTemp: 95, rpm: 4500, battery: 12.4, fuel: 50 },
        battery: { speed: 45, engineTemp: 82, rpm: 1800, battery: 9.8, fuel: 40 },
        rpm: { speed: 110, engineTemp: 105, rpm: 7200, battery: 12.1, fuel: 30 }
    };

    const testCase = testCases[type];
    if (testCase) {
        document.getElementById('speedVal').value = testCase.speed;
        document.getElementById('speed').value = testCase.speed;
        document.getElementById('engineTempVal').value = testCase.engineTemp;
        document.getElementById('engineTemp').value = testCase.engineTemp;
        document.getElementById('rpmVal').value = testCase.rpm;
        document.getElementById('rpm').value = testCase.rpm;
        document.getElementById('batteryVal').value = testCase.battery;
        document.getElementById('battery').value = testCase.battery;
        document.getElementById('fuelVal').value = testCase.fuel;
        document.getElementById('fuel').value = testCase.fuel;

        showToast(`Loaded ${type} test case`, 'info');
    }
}

// Update charts
function updateCharts(stats) {
    // Severity distribution chart
    const severityCtx = document.getElementById('severityChart');
    if (severityCtx) {
        severityCtx.innerHTML = '';
        const severityData = {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [
                    stats.severity_distribution?.High || 0,
                    stats.severity_distribution?.Medium || 0,
                    stats.severity_distribution?.Low || 0
                ],
                backgroundColor: ['#e74c3c', '#f39c12', '#27ae60']
            }]
        };

        // Simple bar chart using divs
        createBarChart(severityCtx, severityData);
    }

    // Fault types chart
    const faultCtx = document.getElementById('faultChart');
    if (faultCtx && stats.fault_type_distribution) {
        faultCtx.innerHTML = '';
        const faultData = {
            labels: Object.keys(stats.fault_type_distribution).slice(0, 5),
            datasets: [{
                data: Object.values(stats.fault_type_distribution).slice(0, 5),
                backgroundColor: '#667eea'
            }]
        };

        createBarChart(faultCtx, faultData);
    }
}

// Simple bar chart creator
function createBarChart(container, data) {
    const maxValue = Math.max(...data.datasets[0].data);

    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    data.labels.forEach((label, index) => {
        const value = data.datasets[0].data[index];
        const percentage = (value / maxValue) * 100;

        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.alignItems = 'center';
        barContainer.style.gap = '10px';

        const labelSpan = document.createElement('span');
        labelSpan.style.width = '80px';
        labelSpan.textContent = label;

        const bar = document.createElement('div');
        bar.style.height = '20px';
        bar.style.width = `${percentage}%`;
        bar.style.background = data.datasets[0].backgroundColor[index] || data.datasets[0].backgroundColor;
        bar.style.borderRadius = '4px';
        bar.style.transition = 'width 0.3s';

        const valueSpan = document.createElement('span');
        valueSpan.textContent = value;

        barContainer.appendChild(labelSpan);
        barContainer.appendChild(bar);
        barContainer.appendChild(valueSpan);

        container.appendChild(barContainer);
    });
}

// Utility functions
function updateValue(inputId, value) {
    document.getElementById(inputId).value = value;
}

function updateRange(rangeId, value) {
    document.getElementById(rangeId).value = value;
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }

    autoRefreshInterval = setInterval(() => {
        if (document.querySelector('#live-tab.active')) {
            loadRecentTelemetry();
        }
        if (document.querySelector('#alerts-tab.active')) {
            loadAlerts();
        }
        loadDashboardStats();
    }, 5000);
}

// Refresh button handler
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadRecentTelemetry();
    loadAlerts();
    loadDashboardStats();
    showToast('Data refreshed', 'success');
});