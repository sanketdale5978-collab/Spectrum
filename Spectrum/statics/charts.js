// charts.js — All Chart.js chart instances and update functions

const Charts = (() => {
  const WAVELENGTHS = Array.from({ length: 401 }, (_, i) => 380 + i);
  let singleChart = null;
  let compareChart = null;
  let avgSpecChart = null;
  let peakHistChart = null;
  let warmCoolChart = null;
  let energyDistChart = null;

  const CHART_DEFAULTS = {
    animation: { duration: 200 },
    responsive: true,
    maintainAspectRatio: false,
  };

  // ── Single pixel spectrum ─────────────────────────────────────────────────
  function initSingleChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    singleChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: WAVELENGTHS,
        datasets: [{
          label: "Spectrum",
          data: new Array(401).fill(0),
          borderColor: "#EF4444",
          backgroundColor: "rgba(239,68,68,0.08)",
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            ticks: { maxTicksLimit: 8, color: "#94A3B8", font: { size: 10 } },
            grid: { color: "rgba(148,163,184,0.1)" },
            title: { display: true, text: "Wavelength (nm)", color: "#64748B", font: { size: 11 } }
          },
          y: {
            min: 0, max: 1.2,
            ticks: { maxTicksLimit: 6, color: "#94A3B8", font: { size: 10 } },
            grid: { color: "rgba(148,163,184,0.1)" },
            title: { display: true, text: "Intensity", color: "#64748B", font: { size: 11 } }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateSingleChart(spectrum, hexColor, label) {
    if (!singleChart) return;
    singleChart.data.datasets[0].data = spectrum;
    singleChart.data.datasets[0].borderColor = hexColor || "#EF4444";
    singleChart.data.datasets[0].backgroundColor = (hexColor || "#EF4444") + "18";
    singleChart.data.datasets[0].label = label || "Spectrum";
    singleChart.update("none");
  }

  // ── Compare chart (two spectra + difference) ──────────────────────────────
  function initCompareChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    compareChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: WAVELENGTHS,
        datasets: [
          {
            label: "Pixel A",
            data: new Array(401).fill(0),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59,130,246,0.06)",
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            tension: 0.3,
          },
          {
            label: "Pixel B",
            data: new Array(401).fill(0),
            borderColor: "#F97316",
            backgroundColor: "rgba(249,115,22,0.06)",
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            tension: 0.3,
          },
          {
            label: "Difference (A−B)",
            data: new Array(401).fill(0),
            borderColor: "rgba(148,163,184,0.7)",
            backgroundColor: "rgba(148,163,184,0.04)",
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            borderDash: [4, 3],
          }
        ]
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            ticks: { maxTicksLimit: 8, color: "#94A3B8", font: { size: 10 } },
            grid: { color: "rgba(148,163,184,0.1)" },
            title: { display: true, text: "Wavelength (nm)", color: "#64748B", font: { size: 11 } }
          },
          y: {
            ticks: { maxTicksLimit: 6, color: "#94A3B8", font: { size: 10 } },
            grid: { color: "rgba(148,163,184,0.1)" },
          }
        },
        plugins: {
          legend: {
            labels: { color: "#94A3B8", font: { size: 11 }, boxWidth: 14 }
          }
        }
      }
    });
  }

  function updateCompareChart(specA, specB, difference, labelA, labelB) {
    if (!compareChart) return;
    compareChart.data.datasets[0].data = specA;
    compareChart.data.datasets[1].data = specB;
    compareChart.data.datasets[2].data = difference;
    compareChart.data.datasets[0].label = labelA || "Pixel A";
    compareChart.data.datasets[1].label = labelB || "Pixel B";
    compareChart.update("none");
  }

  // ── Average spectrum ──────────────────────────────────────────────────────
  function initAvgSpecChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    avgSpecChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: WAVELENGTHS,
        datasets: [{
          label: "Avg Spectrum",
          data: new Array(401).fill(0),
          borderColor: "#8B5CF6",
          backgroundColor: "rgba(139,92,246,0.1)",
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: { ticks: { maxTicksLimit: 6, color: "#94A3B8", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.1)" } },
          y: { min: 0, ticks: { maxTicksLimit: 4, color: "#94A3B8", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.1)" } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateAvgSpecChart(spectrum) {
    if (!avgSpecChart) return;
    avgSpecChart.data.datasets[0].data = spectrum;
    avgSpecChart.update("none");
  }

  // ── Peak wavelength histogram ─────────────────────────────────────────────
  function initPeakHistChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    peakHistChart = new Chart(ctx, {
      type: "bar",
      data: { labels: [], datasets: [{ label: "Blocks", data: [], backgroundColor: [], borderWidth: 0 }] },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: { ticks: { color: "#94A3B8", font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { maxTicksLimit: 4, color: "#94A3B8", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.1)" } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updatePeakHistChart(peakHistogram) {
    if (!peakHistChart) return;
    const entries = Object.entries(peakHistogram).sort((a, b) => +a[0] - +b[0]);
    const labels = entries.map(([nm]) => nm + "nm");
    const data = entries.map(([, cnt]) => cnt);
    const colors = entries.map(([nm]) => nmToHex(+nm));
    peakHistChart.data.labels = labels;
    peakHistChart.data.datasets[0].data = data;
    peakHistChart.data.datasets[0].backgroundColor = colors;
    peakHistChart.update("none");
  }

  function nmToHex(nm) {
    let r = 0, g = 0, b = 0;
    if (nm < 450)       { r = Math.round((450 - nm) / 70 * 128 + 60); b = 220; }
    else if (nm < 495)  { g = Math.round((nm - 450) / 45 * 220); b = 220; }
    else if (nm < 570)  { g = 200; b = Math.round((570 - nm) / 75 * 200); }
    else if (nm < 590)  { r = Math.round((nm - 570) / 20 * 240); g = 200; }
    else if (nm < 620)  { r = 240; g = Math.round((620 - nm) / 30 * 180); }
    else                { r = 230; }
    return `rgb(${r},${g},${b})`;
  }

  // ── Warm / Cool donut ─────────────────────────────────────────────────────
  function initWarmCoolChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    warmCoolChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Warm (≥570nm)", "Cool (<570nm)"],
        datasets: [{
          data: [50, 50],
          backgroundColor: ["#F97316", "#3B82F6"],
          borderWidth: 0,
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        cutout: "65%",
        plugins: {
          legend: { labels: { color: "#94A3B8", font: { size: 10 }, boxWidth: 12 }, position: "bottom" }
        }
      }
    });
  }

  function updateWarmCoolChart(warmCount, coolCount) {
    if (!warmCoolChart) return;
    warmCoolChart.data.datasets[0].data = [warmCount, coolCount];
    warmCoolChart.update("none");
  }

  // ── Energy distribution area chart ───────────────────────────────────────
  function initEnergyDistChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    energyDistChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: WAVELENGTHS,
        datasets: [{
          label: "Spectral Energy",
          data: new Array(401).fill(0),
          borderColor: "#10B981",
          backgroundColor: "rgba(16,185,129,0.15)",
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: { ticks: { maxTicksLimit: 6, color: "#94A3B8", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.1)" } },
          y: { min: 0, ticks: { maxTicksLimit: 4, color: "#94A3B8", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.1)" } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateEnergyDistChart(spectrum) {
    if (!energyDistChart) return;
    energyDistChart.data.datasets[0].data = spectrum;
    energyDistChart.update("none");
  }

  return {
    initSingleChart, updateSingleChart,
    initCompareChart, updateCompareChart,
    initAvgSpecChart, updateAvgSpecChart,
    initPeakHistChart, updatePeakHistChart,
    initWarmCoolChart, updateWarmCoolChart,
    initEnergyDistChart, updateEnergyDistChart,
  };
})();
