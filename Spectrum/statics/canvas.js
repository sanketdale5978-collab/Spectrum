// canvas.js — Bitmap grid rendering and interaction

const CanvasManager = (() => {
  let canvas, ctx;
  let gridW = 0, gridH = 0;
  let blockSize = 8;           // display pixels per grid block
  let imageData = null;        // ImageData for fast pixel access
  let pixelColors = null;      // Float32Array (gridH * gridW * 3) r,g,b 0-255

  let compareMode = false;
  let markerA = null;          // {x, y}
  let markerB = null;
  let overlayGrid = null;      // 2D array of values for heatmap
  let overlayMode = "none";

  let onPixelClick = null;     // callback(x, y, isCompareB)

  const BLOCK_DISPLAY = 10;    // px per block on screen (may scale)

  function init(canvasEl, clickCallback) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    onPixelClick = clickCallback;

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onMouseClick);
  }

  function loadGrid(gw, gh, thumbBase64) {
    gridW = gw;
    gridH = gh;
    blockSize = Math.max(4, Math.min(16, Math.floor(600 / Math.max(gw, gh))));

    canvas.width = gridW * blockSize;
    canvas.height = gridH * blockSize;

    // Load the thumbnail and extract pixel colours
    const img = new Image();
    img.onload = () => {
      // Draw to offscreen canvas at grid size to extract exact block colours
      const offscreen = document.createElement("canvas");
      offscreen.width = gridW;
      offscreen.height = gridH;
      const octx = offscreen.getContext("2d");
      octx.drawImage(img, 0, 0, gridW, gridH);
      imageData = octx.getImageData(0, 0, gridW, gridH);
      pixelColors = new Float32Array(imageData.data.buffer.slice());
      drawGrid();
    };
    img.src = "data:image/png;base64," + thumbBase64;
  }

  function getBlockColor(x, y) {
    const idx = (y * gridW + x) * 4;
    return [imageData.data[idx], imageData.data[idx + 1], imageData.data[idx + 2]];
  }

  function wavelengthToRgb(nm) {
    // Map dominant wavelength to visible colour for overlay
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 450)      { r = (450 - nm) / 70 * 0.5 + 0.3; b = 1.0; }
    else if (nm < 495)              { g = (nm - 450) / 45; b = 1.0; }
    else if (nm < 570)              { r = 0; g = 1.0; b = (570 - nm) / 75; }
    else if (nm < 590)              { r = (nm - 570) / 20; g = 1.0; b = 0; }
    else if (nm < 620)              { r = 1.0; g = (620 - nm) / 30; b = 0; }
    else                            { r = 1.0; g = 0; b = 0; }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function energyToRgb(energy) {
    // 0–1 energy → blue→green→yellow→red heatmap
    const e = Math.max(0, Math.min(1, energy));
    let r, g, b;
    if (e < 0.25)      { r = 0; g = Math.round(e / 0.25 * 255); b = 255; }
    else if (e < 0.5)  { r = 0; g = 255; b = Math.round((0.5 - e) / 0.25 * 255); }
    else if (e < 0.75) { r = Math.round((e - 0.5) / 0.25 * 255); g = 255; b = 0; }
    else               { r = 255; g = Math.round((1.0 - e) / 0.25 * 255); b = 0; }
    return [r, g, b];
  }

  function ratioToRgb(ratio) {
    const v = Math.max(0, Math.min(1, ratio));
    return [Math.round(v * 255), Math.round((1 - v) * 255), 0];
  }

  function drawGrid(hoverX = -1, hoverY = -1) {
    if (!imageData) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        let [r, g, b] = getBlockColor(x, y);

        // Apply overlay if active
        if (overlayGrid && overlayMode !== "none") {
          const val = overlayGrid[y][x];
          let oc;
          if (overlayMode === "peak")         oc = wavelengthToRgb(val);
          else if (overlayMode === "energy")  oc = energyToRgb(val);
          else                                oc = ratioToRgb(val);

          // Blend 70% overlay, 30% original
          r = Math.round(oc[0] * 0.7 + r * 0.3);
          g = Math.round(oc[1] * 0.7 + g * 0.3);
          b = Math.round(oc[2] * 0.7 + b * 0.3);
        }

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);

        // Grid line
        ctx.strokeStyle = "rgba(0,0,0,0.18)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
      }
    }

    // Hover highlight
    if (hoverX >= 0 && hoverY >= 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hoverX * blockSize, hoverY * blockSize, blockSize, blockSize);
    }

    // Marker A (blue)
    if (markerA) drawMarker(markerA.x, markerA.y, "#3B82F6", "A");
    // Marker B (orange)
    if (markerB) drawMarker(markerB.x, markerB.y, "#F97316", "B");
  }

  function drawMarker(x, y, color, label) {
    const cx = x * blockSize + blockSize / 2;
    const cy = y * blockSize + blockSize / 2;
    const r = Math.max(3, blockSize / 2 - 1);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (blockSize >= 8) {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(7, blockSize - 4)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy);
    }
  }

  function getGridPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    return {
      x: Math.max(0, Math.min(gridW - 1, Math.floor(px / blockSize))),
      y: Math.max(0, Math.min(gridH - 1, Math.floor(py / blockSize))),
    };
  }

  function onMouseMove(e) {
    const { x, y } = getGridPos(e);
    drawGrid(x, y);
    canvas.style.cursor = compareMode ? "crosshair" : "pointer";
  }

  function onMouseLeave() {
    drawGrid();
    canvas.style.cursor = "default";
  }

  function onMouseClick(e) {
    if (!imageData) return;
    const { x, y } = getGridPos(e);

    if (compareMode) {
      if (!markerA) {
        markerA = { x, y };
        drawGrid();
        if (onPixelClick) onPixelClick(x, y, false);
      } else if (!markerB) {
        markerB = { x, y };
        drawGrid();
        if (onPixelClick) onPixelClick(x, y, true);
      } else {
        // Reset and start fresh
        markerA = { x, y };
        markerB = null;
        drawGrid();
        if (onPixelClick) onPixelClick(x, y, false);
      }
    } else {
      markerA = { x, y };
      markerB = null;
      drawGrid();
      if (onPixelClick) onPixelClick(x, y, false);
    }
  }

  function setOverlay(mode, grid) {
    overlayMode = mode;
    overlayGrid = grid;
    drawGrid();
  }

  function setCompareMode(enabled) {
    compareMode = enabled;
    if (!enabled) {
      markerA = null;
      markerB = null;
      drawGrid();
    }
  }

  function clearMarkers() {
    markerA = null;
    markerB = null;
    drawGrid();
  }

  return { init, loadGrid, setOverlay, setCompareMode, clearMarkers };
})();
