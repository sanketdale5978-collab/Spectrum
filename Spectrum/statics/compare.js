// compare.js — Two-pixel comparison panel logic

const CompareManager = (() => {
  let pixelA = null;
  let pixelB = null;
  let compareModeActive = false;

  function setCompareMode(enabled) {
    compareModeActive = enabled;
    CanvasManager.setCompareMode(enabled);

    const panel = document.getElementById("compare-panel");
    const btn = document.getElementById("compare-toggle");

    if (enabled) {
      btn.classList.add("active");
      btn.textContent = "Compare Mode: ON";
      panel.classList.remove("hidden");
      resetCompare();
    } else {
      btn.classList.remove("active");
      btn.textContent = "Compare Mode";
      pixelA = null;
      pixelB = null;
      updateCompareUI();
    }
  }

  function resetCompare() {
    pixelA = null;
    pixelB = null;
    updateCompareUI();
    document.getElementById("compare-hint").textContent = "Click pixel A on the canvas";
  }

  async function onPixelSelected(x, y, isB) {
    if (!compareModeActive) return;

    if (!isB) {
      pixelA = { x, y };
      pixelB = null;
      document.getElementById("compare-hint").textContent = "Now click pixel B";
      updateCompareUI();
    } else {
      pixelB = { x, y };
      document.getElementById("compare-hint").textContent = "Comparing…";
      await fetchCompare();
    }
  }

  async function fetchCompare() {
    if (!pixelA || !pixelB) return;

    try {
      const res = await fetch(
        `/compare?x1=${pixelA.x}&y1=${pixelA.y}&x2=${pixelB.x}&y2=${pixelB.y}`
      );
      const data = await res.json();
      if (data.error) { console.error(data.error); return; }

      // Update compare chart
      Charts.updateCompareChart(
        data.pixel_a.spectrum,
        data.pixel_b.spectrum,
        data.difference,
        `A (${pixelA.x},${pixelA.y}) ${data.pixel_a.HEX}`,
        `B (${pixelB.x},${pixelB.y}) ${data.pixel_b.HEX}`
      );

      // Update stats panel
      document.getElementById("cmp-hex-a").textContent = data.pixel_a.HEX;
      document.getElementById("cmp-hex-a").style.color = data.pixel_a.HEX;
      document.getElementById("cmp-hex-b").textContent = data.pixel_b.HEX;
      document.getElementById("cmp-hex-b").style.color = data.pixel_b.HEX;

      document.getElementById("cmp-peak-a").textContent = data.pixel_a.peak_nm + " nm";
      document.getElementById("cmp-peak-b").textContent = data.pixel_b.peak_nm + " nm";
      document.getElementById("cmp-energy-a").textContent = data.pixel_a.energy;
      document.getElementById("cmp-energy-b").textContent = data.pixel_b.energy;

      document.getElementById("cmp-spectral-dist").textContent = data.spectral_distance.toFixed(4);
      document.getElementById("cmp-peak-diff").textContent =
        Math.abs(data.peak_diff_nm) + " nm (" + (data.warmer === "A" ? "A warmer" : "B warmer") + ")";
      document.getElementById("cmp-metameric").textContent = data.metameric_risk.toFixed(3);

      const risk = data.metameric_risk;
      const riskEl = document.getElementById("cmp-metameric");
      riskEl.className = risk > 2 ? "risk-high" : risk > 1 ? "risk-med" : "risk-low";

      document.getElementById("compare-hint").textContent = "Click any pixel to restart";
      document.getElementById("compare-stats").classList.remove("hidden");

    } catch (err) {
      console.error("Compare fetch error:", err);
    }
  }

  function updateCompareUI() {
    document.getElementById("compare-stats").classList.add("hidden");
    if (!pixelA && !pixelB) {
      document.getElementById("cmp-hex-a").textContent = "—";
      document.getElementById("cmp-hex-b").textContent = "—";
    }
  }

  function bindToggle() {
    document.getElementById("compare-toggle").addEventListener("click", () => {
      setCompareMode(!compareModeActive);
    });
  }

  return { bindToggle, onPixelSelected, setCompareMode, resetCompare };
})();
