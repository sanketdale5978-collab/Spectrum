import os
import io
import base64
import numpy as np
from flask import Flask, request, jsonify, send_file, render_template
from PIL import Image
import colorsys

from model import SpectrumTransfer
from export import build_powerbi_csv, to_csv_bytes, to_excel_bytes, \
    peak_wavelength, spectral_energy, spectral_category, warmth_category, rgb_to_hsl

app = Flask(__name__, 
            static_folder="statics",
            static_url_path="/statics",
            template_folder="template")
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights")
UPLOADS_PATH = os.path.join(os.path.dirname(__file__), "uploads")
EXPORTS_PATH = os.path.join(os.path.dirname(__file__), "exports")

os.makedirs(UPLOADS_PATH, exist_ok=True)
os.makedirs(EXPORTS_PATH, exist_ok=True)

# ── Load model once at startup ───────────────────────────────────────────────
transfer = SpectrumTransfer()
transfer.load_files(WEIGHTS_PATH)
print("Model loaded. extend_mode =", transfer.extend_mode)

# ── In-memory state ──────────────────────────────────────────────────────────
state = {
    "spectrum_array": None,   # (H, W, 401)
    "image_array": None,      # (H, W, 3) uint8 RGB — block-averaged
    "original_array": None,   # (H, W, 3) uint8 RGB — original thumbnail
    "grid_w": 0,
    "grid_h": 0,
    "block_size": 8,
}

SPEC_START = 380
WAVELENGTHS = list(range(380, 781))


# ── Helpers ──────────────────────────────────────────────────────────────────

def color_temp_kelvin(r, g, b):
    """Rough CCT estimate via McCamy's formula on chromaticity."""
    if r + g + b == 0:
        return 0
    xc = r / (r + g + b)
    yc = g / (r + g + b)
    if yc == 0:
        return 0
    n = (xc - 0.3320) / (0.1858 - yc)
    cct = 449 * (n ** 3) + 3525 * (n ** 2) + 6823.3 * n + 5520.33
    return max(1000, min(20000, int(cct)))


def pixel_info(x, y):
    spec = state["spectrum_array"][y, x]
    rgb = state["image_array"][y, x]
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    peak = peak_wavelength(spec)
    energy = spectral_energy(spec)
    h, s, l = rgb_to_hsl(r, g, b)
    cct = color_temp_kelvin(r, g, b)
    return {
        "x": x, "y": y,
        "R": r, "G": g, "B": b,
        "HEX": f"#{r:02X}{g:02X}{b:02X}",
        "H": h, "S": s, "L": l,
        "peak_nm": peak,
        "energy": round(energy, 4),
        "category": spectral_category(peak),
        "warmth": warmth_category(peak),
        "color_temp_K": cct,
        "spectrum": [round(float(v), 5) for v in spec],
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    img = Image.open(file.stream).convert("RGB")

    # Determine block size: aim for ~64x64 grid
    block_size = max(4, min(img.width, img.height) // 64)
    # Allow user override
    user_block = request.form.get("block_size")
    if user_block:
        block_size = max(2, min(32, int(user_block)))

    grid_w = img.width // block_size
    grid_h = img.height // block_size

    # Crop to exact grid multiple
    img = img.crop((0, 0, grid_w * block_size, grid_h * block_size))
    img_np = np.array(img, dtype=np.uint8)  # (H_crop, W_crop, 3)

    # Build block-averaged image
    block_img = np.zeros((grid_h, grid_w, 3), dtype=np.uint8)
    for gy in range(grid_h):
        for gx in range(grid_w):
            patch = img_np[gy*block_size:(gy+1)*block_size,
                           gx*block_size:(gx+1)*block_size, :]
            block_img[gy, gx] = patch.reshape(-1, 3).mean(axis=0).astype(np.uint8)

    # Run spectrum model on block-averaged image
    spec_array = transfer.transfer(block_img)   # (grid_h, grid_w, 401)
    spec_array = spec_array.astype(np.float32)

    # Thumbnail for display (original colours, grid-sized)
    thumb_img = Image.fromarray(block_img)
    buf = io.BytesIO()
    thumb_img.save(buf, format="PNG")
    thumb_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    state["spectrum_array"] = spec_array
    state["image_array"] = block_img
    state["grid_w"] = grid_w
    state["grid_h"] = grid_h
    state["block_size"] = block_size

    return jsonify({
        "grid_w": grid_w,
        "grid_h": grid_h,
        "block_size": block_size,
        "thumb": thumb_b64,
    })


@app.route("/pixel")
def pixel():
    if state["spectrum_array"] is None:
        return jsonify({"error": "No image loaded"}), 400
    x = int(request.args.get("x", 0))
    y = int(request.args.get("y", 0))
    x = max(0, min(x, state["grid_w"] - 1))
    y = max(0, min(y, state["grid_h"] - 1))
    return jsonify(pixel_info(x, y))


@app.route("/heatmap")
def heatmap():
    if state["spectrum_array"] is None:
        return jsonify({"error": "No image loaded"}), 400

    mode = request.args.get("mode", "peak")
    H, W, _ = state["spectrum_array"].shape
    grid = []

    for y in range(H):
        row = []
        for x in range(W):
            spec = state["spectrum_array"][y, x]
            rgb = state["image_array"][y, x]
            if mode == "peak":
                val = peak_wavelength(spec)
            elif mode == "energy":
                val = round(spectral_energy(spec), 4)
            elif mode == "red_ratio":
                total = float(np.sum(spec)) or 1.0
                val = round(float(np.sum(spec[220:])) / total, 4)  # 600–780nm
            elif mode == "green_ratio":
                total = float(np.sum(spec)) or 1.0
                val = round(float(np.sum(spec[115:190])) / total, 4)  # 495–570nm
            elif mode == "blue_ratio":
                total = float(np.sum(spec)) or 1.0
                val = round(float(np.sum(spec[:70])) / total, 4)  # 380–450nm
            else:
                val = peak_wavelength(spec)
            row.append(val)
        grid.append(row)

    return jsonify({"mode": mode, "grid": grid, "grid_w": W, "grid_h": H})


@app.route("/compare")
def compare():
    if state["spectrum_array"] is None:
        return jsonify({"error": "No image loaded"}), 400
    x1 = int(request.args.get("x1", 0))
    y1 = int(request.args.get("y1", 0))
    x2 = int(request.args.get("x2", 1))
    y2 = int(request.args.get("y2", 1))
    pa = pixel_info(x1, y1)
    pb = pixel_info(x2, y2)

    spec_a = np.array(pa["spectrum"])
    spec_b = np.array(pb["spectrum"])
    diff = (spec_a - spec_b).tolist()
    spectral_dist = float(np.linalg.norm(spec_a - spec_b))
    peak_diff = pa["peak_nm"] - pb["peak_nm"]

    # Metameric risk: similar RGB but different spectra
    rgb_dist = float(np.linalg.norm(
        np.array([pa["R"], pa["G"], pa["B"]]) - np.array([pb["R"], pb["G"], pb["B"]])
    ))
    metameric_risk = round(spectral_dist / (rgb_dist + 1e-6), 3)

    return jsonify({
        "pixel_a": pa,
        "pixel_b": pb,
        "difference": [round(v, 5) for v in diff],
        "spectral_distance": round(spectral_dist, 4),
        "peak_diff_nm": peak_diff,
        "metameric_risk": metameric_risk,
        "warmer": "A" if pa["peak_nm"] > pb["peak_nm"] else "B",
    })


@app.route("/summary")
def summary():
    if state["spectrum_array"] is None:
        return jsonify({"error": "No image loaded"}), 400

    H, W, _ = state["spectrum_array"].shape
    flat_spec = state["spectrum_array"].reshape(-1, 401)
    avg_spec = flat_spec.mean(axis=0).tolist()

    peaks = [peak_wavelength(flat_spec[i]) for i in range(flat_spec.shape[0])]
    peak_hist = {}
    for p in peaks:
        bucket = (p // 10) * 10
        peak_hist[str(bucket)] = peak_hist.get(str(bucket), 0) + 1

    warm_count = sum(1 for p in peaks if p >= 570)
    cool_count = len(peaks) - warm_count

    # Top 5 colors by frequency
    flat_rgb = state["image_array"].reshape(-1, 3)
    quantized = (flat_rgb // 32) * 32
    color_counts = {}
    for c in quantized:
        key = f"#{c[0]:02X}{c[1]:02X}{c[2]:02X}"
        color_counts[key] = color_counts.get(key, 0) + 1
    top5 = sorted(color_counts.items(), key=lambda x: -x[1])[:5]

    return jsonify({
        "avg_spectrum": [round(v, 5) for v in avg_spec],
        "peak_histogram": peak_hist,
        "warm_count": warm_count,
        "cool_count": cool_count,
        "warm_ratio": round(warm_count / len(peaks), 3),
        "top5_colors": [{"hex": h, "count": c} for h, c in top5],
        "grid_w": W,
        "grid_h": H,
        "total_blocks": W * H,
    })


@app.route("/export")
def export():
    if state["spectrum_array"] is None:
        return jsonify({"error": "No image loaded"}), 400

    fmt = request.args.get("format", "csv")
    df = build_powerbi_csv(state["spectrum_array"], state["image_array"])

    if fmt == "excel":
        data = to_excel_bytes(df)
        return send_file(
            io.BytesIO(data),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="spectra_export.xlsx"
        )
    else:
        data = to_csv_bytes(df)
        return send_file(
            io.BytesIO(data),
            mimetype="text/csv",
            as_attachment=True,
            download_name="spectra_export.csv"
        )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
