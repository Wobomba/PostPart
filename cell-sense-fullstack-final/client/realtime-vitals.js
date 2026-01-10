// === Real-Time Vitals Simulation ===

function simulateVitals() {
  const vitals = {
    heartRate: Math.floor(Math.random() * 20) + 80,        // 80–100 bpm
    oxygen: Math.floor(Math.random() * 5) + 94,            // 94–98%
    temperature: (Math.random() * 1.5 + 36.5).toFixed(1),  // 36.5–38.0°C
    hydration: Math.floor(Math.random() * 20) + 60,        // 60–80%
    pain: Math.floor(Math.random() * 5)                    // 0–4
  };

  document.getElementById("heartRate").textContent = vitals.heartRate;
  document.getElementById("oxygen").textContent = vitals.oxygen;
  document.getElementById("temperature").textContent = vitals.temperature;
  document.getElementById("hydration").textContent = vitals.hydration;
  document.getElementById("pain").textContent = vitals.pain;

  const alertBox = document.getElementById("crisisAlert");
  if (vitals.heartRate > 120 || vitals.oxygen < 93 || vitals.temperature > 38 || vitals.hydration < 50) {
    alertBox.classList.remove("d-none");
  } else {
    alertBox.classList.add("d-none");
  }
}

// Run every 5 seconds
setInterval(simulateVitals, 5000);
simulateVitals();
