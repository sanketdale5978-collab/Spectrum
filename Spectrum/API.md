"""
API Documentation — Spectra Lens

This document describes all REST endpoints available in the Spectra Lens application.
Base URL: http://localhost:5000

"""

# =============================================================================
# 1. UPLOAD ENDPOINT
# =============================================================================

"""
POST /upload
---

Upload and process an RGB image into a spectral bitmap grid.

Request:
  Content-Type: multipart/form-data
  
  Parameters:
    - image (file, required): Image file (PNG, JPG, BMP, GIF)
    - block_size (int, optional): Size of bitmap blocks in pixels (2-32, default: auto)

Example:
  curl -X POST http://localhost:5000/upload \
    -F "image=@photo.jpg" \
    -F "block_size=8"

Response: 200 OK
  {
    "grid_w": 50,
    "grid_h": 50,
    "block_size": 8,
    "thumb": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }

Response: 400 Bad Request
  {
    "error": "No image uploaded"
  }

Notes:
  - Image is converted to RGB automatically
  - Block size determines grid resolution (smaller = more detail, longer processing)
  - Auto block size targets ~64×64 grid for performance
  - Thumbnail is base64-encoded PNG for display on canvas
"""


# =============================================================================
# 2. PIXEL ENDPOINT
# =============================================================================

"""
GET /pixel?x=<x>&y=<y>
---

Fetch spectral data for a single pixel in the bitmap grid.

Query Parameters:
  - x (int, required): X coordinate (0 to grid_w-1)
  - y (int, required): Y coordinate (0 to grid_h-1)

Example:
  curl http://localhost:5000/pixel?x=25&y=30

Response: 200 OK
  {
    "x": 25,
    "y": 30,
    "R": 245,
    "G": 120,
    "B": 60,
    "HEX": "#F57834",
    "H": 16,
    "S": 75,
    "L": 60,
    "peak_nm": 585.0,
    "energy": 0.34567,
    "category": "orange",
    "warmth": "warm",
    "color_temp_K": 4500,
    "spectrum": [
      0.001234,
      0.001456,
      ...
      (401 total wavelength values)
    ]
  }

Response: 400 Bad Request
  {
    "error": "No image loaded"
  }

Field Descriptions:
  - x, y: Grid coordinates
  - R, G, B: Color channels (0-255)
  - HEX: Hexadecimal color code
  - H: Hue (0-360°)
  - S: Saturation (0-100%)
  - L: Lightness (0-100%)
  - peak_nm: Dominant wavelength in nanometers
  - energy: Spectral energy (integrated intensity)
  - category: Color classification (Violet/Blue/Green/Yellow/Orange/Red)
  - warmth: Classification (Warm if peak ≥ 570nm, Cool otherwise)
  - color_temp_K: Estimated correlated color temperature (Kelvin)
  - spectrum: 401 floats (380-780nm, 1nm resolution)
"""


# =============================================================================
# 3. HEATMAP ENDPOINT
# =============================================================================

"""
GET /heatmap?mode=<mode>
---

Generate heatmap overlay data for visualization on the canvas.

Query Parameters:
  - mode (string, required): Overlay mode
    Allowed values:
      - "peak"        : Dominant wavelength (380-780nm)
      - "energy"      : Spectral energy (0-1 normalized)
      - "red_ratio"   : Red channel dominance (620-780nm ratio)
      - "green_ratio" : Green channel dominance (495-570nm ratio)
      - "blue_ratio"  : Blue channel dominance (380-450nm ratio)

Example:
  curl "http://localhost:5000/heatmap?mode=peak"

Response: 200 OK
  {
    "mode": "peak",
    "grid": [
      [450, 480, 520, 560, 590, ...],
      [460, 490, 510, 550, 600, ...],
      ...
    ],
    "grid_w": 50,
    "grid_h": 50
  }

Response: 400 Bad Request
  {
    "error": "No image loaded"
  }

Grid Values by Mode:
  - peak:       Wavelength in nanometers (380-780)
  - energy:     Float 0.0-1.0
  - *_ratio:    Float 0.0-1.0 (ratio of channel energy)

Notes:
  - Frontend blends heatmap with original RGB at 70% overlay, 30% original
  - Heatmap is recomputed on each request (consider caching for large grids)
"""


# =============================================================================
# 4. COMPARE ENDPOINT
# =============================================================================

"""
GET /compare?x1=<x1>&y1=<y1>&x2=<x2>&y2=<y2>
---

Compare spectra of two pixels, compute metrics.

Query Parameters:
  - x1, y1 (int, required): Coordinates of first pixel (A)
  - x2, y2 (int, required): Coordinates of second pixel (B)

Example:
  curl "http://localhost:5000/compare?x1=25&y1=30&x2=40&y2=15"

Response: 200 OK
  {
    "pixel_a": {
      "x": 25,
      "y": 30,
      "R": 245,
      "G": 120,
      "B": 60,
      "HEX": "#F57834",
      "H": 16,
      "S": 75,
      "L": 60,
      "peak_nm": 585.0,
      "energy": 0.34567,
      "category": "orange",
      "warmth": "warm",
      "color_temp_K": 4500,
      "spectrum": [0.001234, ...]
    },
    "pixel_b": { ... },
    "difference": [0.0001, -0.0002, 0.00015, ...],
    "spectral_distance": 0.3456,
    "peak_diff_nm": 45,
    "metameric_risk": 1.234,
    "warmer": "A"
  }

Field Descriptions:
  - pixel_a, pixel_b: Full pixel info (see /pixel endpoint)
  - difference: Element-wise difference spectrum (B - A)
  - spectral_distance: L2 norm (Euclidean distance) of difference spectrum
  - peak_diff_nm: Difference in dominant wavelengths (positive if A is warmer)
  - metameric_risk: Ratio of spectral distance to RGB distance
    - < 1.0: Low risk (spectra similar despite RGB difference)
    - 1.0-2.0: Medium risk
    - > 2.0: High risk (very different spectra)
  - warmer: Which pixel has higher peak wavelength ("A" or "B")

Notes:
  - Useful for identifying metamerism (same color, different spectra)
  - High metameric_risk = pixels may not match under different illuminants
"""


# =============================================================================
# 5. SUMMARY ENDPOINT
# =============================================================================

"""
GET /summary
---

Compute image-wide statistics and aggregations.

Example:
  curl http://localhost:5000/summary

Response: 200 OK
  {
    "avg_spectrum": [0.1234, 0.1456, ..., 0.0891],
    "peak_histogram": {
      "380": 5,
      "390": 12,
      "400": 28,
      ...
      "750": 3
    },
    "warm_count": 1250,
    "cool_count": 750,
    "warm_ratio": 0.625,
    "top5_colors": [
      {"hex": "#F57834", "count": 45},
      {"hex": "#A1B2C3", "count": 38},
      {"hex": "#123456", "count": 35},
      {"hex": "#ABCDEF", "count": 32},
      {"hex": "#654321", "count": 29}
    ],
    "grid_w": 50,
    "grid_h": 50,
    "total_blocks": 2500
  }

Response: 400 Bad Request
  {
    "error": "No image loaded"
  }

Field Descriptions:
  - avg_spectrum: Mean spectrum across all pixels (401 values)
  - peak_histogram: Distribution of dominant wavelengths (10nm buckets)
  - warm_count: Pixels with peak ≥ 570nm
  - cool_count: Pixels with peak < 570nm
  - warm_ratio: warm_count / total_blocks
  - top5_colors: 5 most frequent colors (quantized to 32px buckets)
  - grid_w, grid_h: Bitmap grid dimensions
  - total_blocks: Product of grid_w and grid_h

Notes:
  - Colors quantized to nearest multiple of 32 for grouping
  - Histogram computed after image processing (not original colors)
"""


# =============================================================================
# 6. EXPORT ENDPOINT
# =============================================================================

"""
GET /export?format=<format>
---

Download processed image data in CSV or Excel format.

Query Parameters:
  - format (string, required): Export format
    Allowed values:
      - "csv"   : Comma-separated values
      - "excel" : Microsoft Excel workbook (.xlsx)

Example:
  curl http://localhost:5000/export?format=csv > export.csv
  curl http://localhost:5000/export?format=excel > export.xlsx

Response: 200 OK
  Content-Type: text/csv (for CSV) or application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (for Excel)
  Content-Disposition: attachment; filename="spectra_export.csv"

CSV Format (One row per pixel block):
  x,y,R,G,B,HEX,H,S,L,peak_nm,energy,category,w380,w381,...,w780
  0,0,245,120,60,#F57834,16,75,60,585,0.34567,orange,0.001234,0.001456,...,0.0891

Excel Format (Two sheets):
  Sheet 1: "Pixel_Data"
    Columns: x, y, R, G, B, HEX, H, S, L, peak_nm, energy, category
    Rows: One per pixel block
    
  Sheet 2: "Spectra"
    Columns: x, y, w380, w381, ..., w780
    Rows: One per pixel block

Response: 400 Bad Request
  {
    "error": "No image loaded"
  }

Column Descriptions:
  - x, y: Grid coordinates
  - R, G, B: Color channels (0-255)
  - HEX: Hexadecimal color code
  - H, S, L: HSL color space
  - peak_nm: Dominant wavelength
  - energy: Spectral energy
  - category: Color category
  - w380-w780: Spectral values for each nanometer (401 columns)

Notes:
  - CSV file size: ~5-10 MB for typical 50×50 grid
  - Excel includes both metadata and full spectral data
  - Power BI compatible (can import directly via Excel connector)
"""


# =============================================================================
# ERROR CODES
# =============================================================================

"""
Common HTTP Status Codes:

200 OK
  Successful request.

400 Bad Request
  Missing or invalid parameters.
  Examples:
    - No image uploaded
    - Invalid coordinate (x/y out of bounds)
    - No image loaded (endpoint called before upload)

500 Internal Server Error
  Server-side error during processing.
  Check server logs for details.
"""


# =============================================================================
# RATE LIMITING & PERFORMANCE
# =============================================================================

"""
Performance Characteristics:

Endpoint              | Typical Response Time | Notes
-------------------  | --------------------- | -------
POST /upload          | 1-5 seconds           | Depends on image size and resolution
GET /pixel            | 5-10 ms               | In-memory lookup
GET /heatmap          | 50-100 ms             | Computed on each request
GET /compare          | 10-20 ms              | Two pixel lookups + metrics
GET /summary          | 100-500 ms            | Aggregation across all pixels
GET /export (CSV)     | 500 ms - 2 s          | Depends on grid size and rows
GET /export (Excel)   | 1-3 seconds           | Includes sheet formatting

Recommendations:
  - Cache heatmap results in frontend (valid until image changes)
  - Batch comparisons if doing many (consider API design)
  - Limit exports to grids < 10,000 pixels for responsiveness
  - Use compression (gzip) for large CSV responses
"""


# =============================================================================
# AUTHENTICATION & SECURITY
# =============================================================================

"""
Current Status:
  - No authentication (localhost only)
  - No CORS headers (same-origin only)
  - File uploads validated by extension and size limit

Production Recommendations:
  1. Add Flask-HTTPAuth for basic/token auth
  2. Enable HTTPS (Flask-Talisman or reverse proxy)
  3. Validate image content (magic bytes, not just extension)
  4. Rate limit endpoints (Flask-Limiter)
  5. Store uploads to disk with cleanup (current: in-memory)
  6. Add request logging and monitoring
"""


# =============================================================================
# CLIENT LIBRARY EXAMPLES
# =============================================================================

"""
Python (requests):

import requests
import json

BASE_URL = "http://localhost:5000"

# Upload image
with open("photo.jpg", "rb") as f:
    files = {"image": f}
    data = {"block_size": "8"}
    resp = requests.post(f"{BASE_URL}/upload", files=files, data=data)
    result = resp.json()
    print(f"Grid: {result['grid_w']}x{result['grid_h']}")

# Get pixel
resp = requests.get(f"{BASE_URL}/pixel?x=25&y=30")
pixel = resp.json()
print(f"Peak wavelength: {pixel['peak_nm']} nm")

# Get heatmap
resp = requests.get(f"{BASE_URL}/heatmap?mode=peak")
heatmap = resp.json()

# Compare pixels
resp = requests.get(f"{BASE_URL}/compare?x1=25&y1=30&x2=40&y2=15")
compare = resp.json()
print(f"Spectral distance: {compare['spectral_distance']}")

# Download CSV
resp = requests.get(f"{BASE_URL}/export?format=csv")
with open("export.csv", "wb") as f:
    f.write(resp.content)


JavaScript (Fetch API):

const BASE_URL = "http://localhost:5000";

// Upload
const formData = new FormData();
formData.append("image", imageFileInput.files[0]);
formData.append("block_size", "8");
const res = await fetch(`${BASE_URL}/upload`, {
  method: "POST",
  body: formData
});
const result = await res.json();

// Get pixel
const pixelRes = await fetch(`${BASE_URL}/pixel?x=25&y=30`);
const pixel = await pixelRes.json();

// Download
const link = document.createElement("a");
link.href = `${BASE_URL}/export?format=csv`;
link.download = "export.csv";
link.click();


cURL:

# Upload
curl -X POST http://localhost:5000/upload \
  -F "image=@photo.jpg" \
  -F "block_size=8"

# Get pixel
curl "http://localhost:5000/pixel?x=25&y=30"

# Get heatmap
curl "http://localhost:5000/heatmap?mode=peak"

# Download CSV
curl http://localhost:5000/export?format=csv -o export.csv
"""

