import numpy as np
import pandas as pd
import colorsys
import io


SPEC_START = 380
SPEC_END = 780
WAVELENGTHS = list(range(SPEC_START, SPEC_END + 1))  # 401 values


def rgb_to_hsl(r, g, b):
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    h, l, s = colorsys.rgb_to_hls(rf, gf, bf)
    return round(h * 360, 1), round(s * 100, 1), round(l * 100, 1)


def peak_wavelength(spectrum):
    idx = int(np.argmax(spectrum))
    return SPEC_START + idx


def spectral_energy(spectrum):
    return float(np.sum(spectrum) / len(spectrum))


def spectral_category(peak_nm):
    if peak_nm < 450:
        return "violet"
    elif peak_nm < 495:
        return "blue"
    elif peak_nm < 570:
        return "green"
    elif peak_nm < 590:
        return "yellow"
    elif peak_nm < 620:
        return "orange"
    else:
        return "red"


def warmth_category(peak_nm):
    return "warm" if peak_nm >= 570 else "cool"


def build_powerbi_csv(spectrum_array, image_array):
    """
    spectrum_array: (H, W, 401) float32
    image_array:    (H, W, 3)   uint8 RGB
    Returns: CSV bytes
    """
    H, W, _ = spectrum_array.shape
    rows = []

    for y in range(H):
        for x in range(W):
            r, g, b = int(image_array[y, x, 0]), int(image_array[y, x, 1]), int(image_array[y, x, 2])
            hex_val = f"#{r:02X}{g:02X}{b:02X}"
            hue, sat, lum = rgb_to_hsl(r, g, b)
            spec = spectrum_array[y, x]
            peak = peak_wavelength(spec)
            energy = spectral_energy(spec)
            category = spectral_category(peak)
            warmth = warmth_category(peak)

            row = {
                "x": x, "y": y,
                "R": r, "G": g, "B": b,
                "HEX": hex_val,
                "H": hue, "S": sat, "L": lum,
                "peak_nm": peak,
                "energy": round(energy, 4),
                "category": category,
                "warmth": warmth,
            }
            for i, wl in enumerate(WAVELENGTHS):
                row[f"w{wl}"] = round(float(spec[i]), 5)

            rows.append(row)

    df = pd.DataFrame(rows)
    return df


def to_csv_bytes(df):
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")


def to_excel_bytes(df):
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        # Main data sheet (without wavelength columns to keep manageable)
        meta_cols = ["x", "y", "R", "G", "B", "HEX", "H", "S", "L", "peak_nm", "energy", "category", "warmth"]
        df[meta_cols].to_excel(writer, sheet_name="Pixel_Data", index=False)
        # Spectrum sheet
        spec_cols = meta_cols[:2] + [f"w{wl}" for wl in WAVELENGTHS]
        df[spec_cols].to_excel(writer, sheet_name="Spectra", index=False)
    buf.seek(0)
    return buf.read()
