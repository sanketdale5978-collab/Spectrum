# SPECTRA LENS — Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Install Dependencies

**Windows:**
```bash
cd c:\Spectrum
pip install -r requirements.txt
```

**macOS/Linux:**
```bash
cd /path/to/Spectrum
pip install -r requirements.txt
```

Or manually:
```bash
pip install Flask numpy pandas pillow openpyxl
```

### Step 2: Verify Model Files

Check that these exist in the `weights/` folder:
- `a.npy` (mapping matrix)
- `b.npy` (PCA eigenvectors)
- `c.npy` (mean spectrum)
- `d.npy` (normalization)
- `e.npy` (extend mode)

### Step 3: Start the Server

**Windows:**
```bash
run.bat
```

**macOS/Linux:**
```bash
python "app (1).py"
```

Expected output:
```
 * Serving Flask app 'app'
 * Running on http://127.0.0.1:5000
 * WARNING: This is a development server. Do not use it in production.
```

### Step 4: Open Browser

Navigate to: **http://localhost:5000**

---

## 📸 First Image Upload

1. **Click "⬆ Upload Image"** or drag an image into the drop zone
2. **Adjust block size** (optional) — smaller = more detail, slower processing
3. **Wait** for processing (1-5 seconds)
4. **Explore** your spectral data!

---

## 🎯 What to Try

### Basic Navigation
- **Hover** over pixels to highlight them
- **Click** any pixel to inspect its spectrum
- View **RGB, HEX, HSL** values and **peak wavelength**

### Overlays
- Click overlay buttons: **Peak λ**, **Energy**, **Red/Green/Blue Ratio**
- Watch the canvas update with color-coded heatmaps
- Click "None" to reset

### Comparison Mode
1. Click **"Compare Mode"** button
2. Click first pixel (marker A in blue)
3. Click second pixel (marker B in orange)
4. View:
   - Spectral distance
   - Peak wavelength difference
   - Metameric risk

### Summary
Scroll down to see:
- **KPI Strip**: Total blocks, warm/cool ratio
- **Charts**: Average spectrum, wavelength distribution
- **Top 5 Colors**: Most frequent colors

### Export
- **⬇ Download CSV**: Power BI compatible
- **⬇ Download Excel**: Two sheets (metadata + spectra)
- **⎘ Copy API Endpoint**: For programmatic access

---

## 🛠️ Troubleshooting

### "Port 5000 is already in use"
Edit the last line of `app (1).py`:
```python
app.run(debug=True, port=5001)  # Change 5000 to 5001
```

### "No module named 'flask'"
```bash
pip install --upgrade Flask numpy pandas pillow openpyxl
```

### Images won't upload
- Check file size (max 32 MB)
- Try PNG format (most compatible)
- Check browser console (F12) for errors

### Charts not showing
- Refresh page (Ctrl+R)
- Clear cache (Ctrl+Shift+Del)
- Check JavaScript console for errors

---

## 📚 Documentation

- **README.md** — Full project overview
- **API.md** — REST API reference (all endpoints)
- **This file** — Quick start guide

---

## 🔗 Useful Links

- **Flask Docs**: https://flask.palletsprojects.com/
- **Chart.js Docs**: https://www.chartjs.org/docs/latest/
- **NumPy Guide**: https://numpy.org/doc/
- **Power BI**: https://powerbi.microsoft.com/

---

## 💡 Tips & Tricks

### Optimizing Performance
- Use smaller images (< 1000×1000 px)
- Increase block size (8-16 px is sweet spot)
- Disable overlays on large grids

### Spectral Analysis
- **Peak λ overlay** shows color distribution
- **Energy overlay** shows brightness
- **Compare mode** finds metamerism (same color, different spectra)
- **Color Temp** estimates warmth in Kelvin

### Exporting Data
- CSV is lightweight, good for Excel
- Excel includes all 401 wavelengths
- Use Power BI connector to refresh automatically

---

## 🚀 Next Steps

1. **Read API.md** for programmatic access
2. **Check config.py** for customization options
3. **Explore model.py** for spectral processing pipeline
4. **Fork & extend** with your own features!

---

## 🐛 Report Issues

If you find bugs:
1. Note the error message
2. Check browser console (F12)
3. Check terminal output
4. Open an issue with:
   - Steps to reproduce
   - Image size / type
   - Error message
   - Browser version

---

## 📊 Example Workflows

### Workflow 1: Basic Exploration
```
1. Upload image
2. Click random pixels
3. Toggle overlays
4. View summary charts
5. Export CSV
```

### Workflow 2: Metameric Analysis
```
1. Upload image
2. Enable Compare Mode
3. Click two similar-colored pixels
4. Compare their spectra
5. Note metameric risk
```

### Workflow 3: Batch Processing (API)
```
1. Start server
2. Write Python script
3. POST to /upload
4. GET /pixel for each point
5. GET /export?format=csv
6. Import to Power BI
```

---

## 🎓 Understanding Spectral Data

### What is Peak Wavelength (λ)?
The dominant color in the spectrum. Red ~620nm, Green ~550nm, Blue ~450nm.

### What is Spectral Energy?
The total intensity across all wavelengths. Higher = brighter.

### What is Metameric Risk?
Likelihood that two pixels will appear different under different lighting. High risk = spectra very different despite similar RGB.

### HSL vs RGB?
- **RGB**: Red, Green, Blue channels (hardware model)
- **HSL**: Hue (color), Saturation (intensity), Lightness (brightness)
- HSL is more intuitive for human perception

### What is Color Temperature (K)?
Warmth of color in Kelvin. Lower (2000K) = warm/yellow, Higher (6500K) = cool/blue.

---

**Happy Spectral Imaging! 🌈**

For questions or feature requests, see README.md or contact the team.

---

*Last Updated: 2026-06-10*
*Spectra Lens v1.0.0 (Production Ready)*
