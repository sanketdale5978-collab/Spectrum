// heatmap.js — Heatmap overlay fetch and apply

const HeatmapManager = (() => {
  let currentMode = "none";
  let isLoading = false;

  async function applyOverlay(mode) {
    if (mode === "none") {
      currentMode = "none";
      CanvasManager.setOverlay("none", null);
      updateToggleUI("none");
      return;
    }

    if (isLoading) return;
    isLoading = true;
    updateToggleUI(mode, true);

    try {
      const res = await fetch(`/heatmap?mode=${mode}`);
      const data = await res.json();
      if (data.error) { console.error(data.error); return; }
      currentMode = mode;
      CanvasManager.setOverlay(mode, data.grid);
      updateToggleUI(mode, false);
    } catch (err) {
      console.error("Heatmap fetch error:", err);
    } finally {
      isLoading = false;
    }
  }

  function updateToggleUI(activeMode, loading = false) {
    document.querySelectorAll(".overlay-btn").forEach(btn => {
      const m = btn.dataset.mode;
      btn.classList.toggle("active", m === activeMode);
      if (m === activeMode && loading) {
        btn.textContent = "Loading…";
      } else {
        btn.textContent = btn.dataset.label;
      }
    });
  }

  function bindButtons() {
    document.querySelectorAll(".overlay-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        if (currentMode === mode) {
          applyOverlay("none");
        } else {
          applyOverlay(mode);
        }
      });
    });
  }

  function reset() {
    currentMode = "none";
    CanvasManager.setOverlay("none", null);
    updateToggleUI("none");
  }

  return { bindButtons, applyOverlay, reset };
})();
