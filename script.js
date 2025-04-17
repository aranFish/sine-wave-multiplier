// Initialize the charts
let inputChart, resultChart;
const numPoints = 2000; // Increased for higher frequency sampling
let isSquareWave = false;

// Generate x-axis points (showing 2 milliseconds total)
const xPoints = Array.from({length: numPoints}, (_, i) => (i / numPoints) * 0.002); // Time in seconds

// Function to format x-axis labels in milliseconds
function formatTimeLabel(value) {
    return `${(value * 1000).toFixed(2)} ms`;
}

// Function to generate wave points
function generateWave(amplitude, frequency, phase) {
    // Convert phase from degrees to radians
    const phaseRad = (phase * Math.PI) / 180;
    
    if (isSquareWave) {
        return xPoints.map(x => {
            const angle = 2 * Math.PI * frequency * 1000 * x + phaseRad;
            // Convert from -1/+1 to 0/1 for square waves
            return amplitude * (Math.sign(Math.sin(angle)) * 0.5 + 0.5);
        });
    } else {
        return xPoints.map(x => 
            amplitude * Math.sin(2 * Math.PI * frequency * 1000 * x + phaseRad)
        );
    }
}

// Single-stage low-pass filter
function singlePassFilter(signal, alpha, initialValue) {
    let filtered = new Array(signal.length);
    filtered[0] = initialValue;
    
    for (let i = 1; i < signal.length; i++) {
        filtered[i] = filtered[i-1] + alpha * (signal[i] - filtered[i-1]);
    }
    
    return filtered;
}

// Multi-stage low-pass filter implementation
function lowPassFilter(signal, cutoffFreq) {
    const dt = 0.002 / numPoints; // Time step in seconds
    const alpha = dt * cutoffFreq / (1 + dt * cutoffFreq);
    
    // For product of waves, DC component is at the midpoint
    const max = Math.max(...signal);
    const min = Math.min(...signal);
    const dcEstimate = (max + min) / 2;
    
    // Apply filter multiple times for steeper rolloff
    let filteredSignal = signal;
    const numStages = 4;
    
    for (let stage = 0; stage < numStages; stage++) {
        // Pre-fill initial state
        let currentState = dcEstimate;
        for (let i = -100; i < 0; i++) {
            let idx = (i + signal.length) % signal.length;
            currentState += alpha * (filteredSignal[idx] - currentState);
        }
        
        // Apply this stage of filtering
        filteredSignal = singlePassFilter(filteredSignal, alpha, currentState);
    }
    
    return filteredSignal;
}

// Function to update slider value displays
function updateSliderValue(sliderId, value) {
    const element = document.getElementById(`${sliderId}-value`);
    if (sliderId.includes('amplitude')) {
        element.textContent = Math.round(value);
    } else if (sliderId.includes('frequency')) {
        element.textContent = value.toFixed(1) + (sliderId === 'cutoffFreq' ? ' Hz' : ' kHz');
    } else if (sliderId.includes('phase')) {
        element.textContent = Math.round(value) + '°';
    }
}

// Function to toggle wave type
function toggleWaveType() {
    isSquareWave = !isSquareWave;
    const button = document.getElementById('waveTypeToggle');
    button.textContent = `Current: ${isSquareWave ? 'Square Wave' : 'Sine Wave'}`;
    
    // Update y-axis scale based on wave type
    const yAxisConfig = {
        min: isSquareWave ? -0.2 : -1.5,
        max: isSquareWave ? 1.2 : 1.5
    };
    
    inputChart.options.scales.y = yAxisConfig;
    resultChart.options.scales.y = yAxisConfig;
    
    updateCharts();
}

// Function to update charts
function updateCharts() {
    // Get current values from sliders
    const amplitudeA = parseFloat(document.getElementById('amplitudeA').value);
    const frequencyA = parseFloat(document.getElementById('frequencyA').value);
    const phaseA = parseFloat(document.getElementById('phaseA').value);
    
    const amplitudeB = parseFloat(document.getElementById('amplitudeB').value);
    const frequencyB = parseFloat(document.getElementById('frequencyB').value);
    const phaseB = parseFloat(document.getElementById('phaseB').value);
    
    const cutoffFreq = parseFloat(document.getElementById('cutoffFreq').value);

    // Update slider value displays
    updateSliderValue('amplitudeA', amplitudeA);
    updateSliderValue('frequencyA', frequencyA);
    updateSliderValue('phaseA', phaseA);
    updateSliderValue('amplitudeB', amplitudeB);
    updateSliderValue('frequencyB', frequencyB);
    updateSliderValue('phaseB', phaseB);
    updateSliderValue('cutoffFreq', cutoffFreq);

    // Generate wave points
    const waveA = generateWave(amplitudeA, frequencyA, phaseA);
    const waveB = generateWave(amplitudeB, frequencyB, phaseB);
    
    // Calculate product wave
    const productWave = waveA.map((val, i) => val * waveB[i]);
    
    // Apply low-pass filter
    const filteredWave = lowPassFilter(productWave, cutoffFreq);

    // Update input waves chart
    inputChart.data.datasets[0].data = waveA;
    inputChart.data.datasets[1].data = waveB;
    inputChart.update();

    // Update result wave chart
    resultChart.data.datasets[0].data = productWave;
    resultChart.data.datasets[1].data = filteredWave;
    resultChart.update();
}

// Initialize charts when the page loads
window.onload = function() {
    const ctx1 = document.getElementById('inputWaves').getContext('2d');
    const ctx2 = document.getElementById('resultWave').getContext('2d');

    const commonScaleOptions = {
        x: {
            ticks: {
                callback: function(value) {
                    return formatTimeLabel(xPoints[value]);
                },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 11
            }
        },
        y: {
            min: -1.5,
            max: 1.5
        }
    };

    // Create input waves chart
    inputChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: xPoints,
            datasets: [{
                label: 'Wave A',
                data: generateWave(1, 7, 0),
                borderColor: 'rgba(255, 0, 0, 0.75)',
                backgroundColor: 'rgba(255, 0, 0, 0.75)',
                borderWidth: 2,
                fill: false,
                tension: 0,
                pointRadius: 0
            },
            {
                label: 'Wave B',
                data: generateWave(1, 7, 0),
                borderColor: 'rgba(0, 0, 255, 0.75)',
                backgroundColor: 'rgba(0, 0, 255, 0.75)',
                borderWidth: 2,
                fill: false,
                tension: 0,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            scales: commonScaleOptions
        }
    });

    // Create result wave chart
    resultChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: xPoints,
            datasets: [{
                label: 'Product Wave',
                data: generateWave(1, 7, 0),
                borderColor: 'rgba(128, 0, 128, 0.75)',
                backgroundColor: 'rgba(128, 0, 128, 0.75)',
                borderWidth: 2,
                fill: false,
                tension: 0,
                pointRadius: 0
            },
            {
                label: 'Filtered Wave',
                data: generateWave(1, 7, 0),
                borderColor: 'rgba(0, 255, 255, 0.75)',
                backgroundColor: 'rgba(0, 255, 255, 0.75)',
                borderWidth: 2,
                fill: false,
                tension: 0,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            scales: commonScaleOptions
        }
    });

    // Add event listeners to all sliders
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        slider.addEventListener('input', updateCharts);
    });

    // Add event listener to wave type toggle button
    document.getElementById('waveTypeToggle').addEventListener('click', toggleWaveType);

    // Initial update
    updateCharts();
}; 