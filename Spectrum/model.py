import numpy as np
import os


class SpectrumTransfer:

    def __init__(self):
        self.extend_mode = 0
        self.pca_eigenvectors = None
        self.pca_mean = None
        self.M = None
        self.TransM = None
        self.TransMin = 0.0
        self.TransMax = 1.0

    def get_extend_color(self, src_rgb):
        extend = None
        if self.extend_mode == 0:
            extend = np.array([
                src_rgb[:, 0], src_rgb[:, 1], src_rgb[:, 2],
                np.power(src_rgb[:, 0], 2),
                np.power(src_rgb[:, 1], 2),
                np.power(src_rgb[:, 2], 2)
            ])
        elif self.extend_mode == 1:
            extend = np.array([
                src_rgb[:, 0], src_rgb[:, 1], src_rgb[:, 2],
                np.power(src_rgb[:, 0], 2),
                np.power(src_rgb[:, 1], 2),
                np.power(src_rgb[:, 2], 2),
                src_rgb[:, 0] * src_rgb[:, 1],
                src_rgb[:, 0] * src_rgb[:, 2],
                src_rgb[:, 1] * src_rgb[:, 2]
            ])
        elif self.extend_mode == 2:
            extend = np.array([
                src_rgb[:, 0], src_rgb[:, 1], src_rgb[:, 2],
                np.power(src_rgb[:, 0], 2),
                np.power(src_rgb[:, 1], 2),
                np.power(src_rgb[:, 2], 2),
                src_rgb[:, 0] * src_rgb[:, 1],
                src_rgb[:, 0] * src_rgb[:, 2],
                src_rgb[:, 1] * src_rgb[:, 2],
                np.power(src_rgb[:, 0], 3),
                np.power(src_rgb[:, 1], 3),
                np.power(src_rgb[:, 2], 3)
            ])
        return extend

    def prepare(self):
        self.TransM = np.dot(self.M.T, self.pca_eigenvectors)

    def load_files(self, weights_path):
        self.M = np.load(os.path.join(weights_path, "a.npy"))
        self.pca_eigenvectors = np.load(os.path.join(weights_path, "b.npy"))
        self.pca_mean = np.load(os.path.join(weights_path, "c.npy"))
        d = np.load(os.path.join(weights_path, "d.npy"))
        self.TransMin = float(d[0])
        self.TransMax = float(d[1])
        e = np.load(os.path.join(weights_path, "e.npy"))
        self.extend_mode = int(e[0])
        self.prepare()

    def transfer(self, src_data):
        src_data = src_data.astype(np.float32)
        src_shape = src_data.shape

        if len(src_shape) >= 3:
            src_data = src_data.reshape(-1, src_shape[-1])

        tar_spec = np.dot(self.get_extend_color(src_data).T, self.TransM) + self.pca_mean

        if len(src_shape) >= 3:
            tar_spec = tar_spec.reshape(src_shape[0:-1] + (self.pca_mean.shape[0],))

        tar_spec = (tar_spec - self.TransMin) / (self.TransMax - self.TransMin)

        return tar_spec


# ── Spectral analysis helpers ────────────────────────────────────────────

def peak_wavelength(spectrum):
    """Find dominant wavelength (peak of spectrum)."""
    idx = np.argmax(spectrum)
    return float(380 + idx)


def spectral_energy(spectrum):
    """Calculate total spectral energy (integral approximation)."""
    return float(np.trapz(spectrum, dx=1.0))


def spectral_category(peak_nm):
    """Classify wavelength into color category."""
    if peak_nm < 380:
        return "UV"
    elif peak_nm < 450:
        return "Violet"
    elif peak_nm < 495:
        return "Blue"
    elif peak_nm < 570:
        return "Green"
    elif peak_nm < 590:
        return "Yellow"
    elif peak_nm < 620:
        return "Orange"
    elif peak_nm < 750:
        return "Red"
    else:
        return "IR"


def warmth_category(peak_nm):
    """Classify as warm or cool."""
    return "Warm" if peak_nm >= 570 else "Cool"


def spectral_distance(spec1, spec2):
    """Euclidean distance between two spectra."""
    return float(np.linalg.norm(spec1 - spec2))


def metameric_similarity(spec1, spec2):
    """
    Estimate metameric similarity (0-1, higher = more similar).
    Based on spectral correlation and RGB similarity.
    """
    # Normalize spectra
    spec1_norm = (spec1 - np.min(spec1)) / (np.max(spec1) - np.min(spec1) + 1e-8)
    spec2_norm = (spec2 - np.min(spec2)) / (np.max(spec2) - np.min(spec2) + 1e-8)
    
    # Correlation
    try:
        corr = np.corrcoef(spec1_norm, spec2_norm)[0, 1]
        corr = np.clip(corr, -1, 1)
    except:
        corr = 0.0
    
    # Convert correlation to similarity (0-1)
    similarity = (corr + 1) / 2
    return float(similarity)


def rgb_to_hsl(r, g, b):
    """Convert RGB (0-255) to HSL (0-360, 0-100, 0-100)."""
    r_norm = r / 255.0
    g_norm = g / 255.0
    b_norm = b / 255.0
    
    max_c = max(r_norm, g_norm, b_norm)
    min_c = min(r_norm, g_norm, b_norm)
    l = (max_c + min_c) / 2.0
    
    if max_c == min_c:
        h = s = 0.0
    else:
        d = max_c - min_c
        s = d / (2.0 - max_c - min_c) if l > 0.5 else d / (max_c + min_c)
        
        if max_c == r_norm:
            h = (g_norm - b_norm) / d + (6 if g_norm < b_norm else 0)
        elif max_c == g_norm:
            h = (b_norm - r_norm) / d + 2
        else:
            h = (r_norm - g_norm) / d + 4
        h /= 6.0
    
    return (
        int(h * 360),
        int(s * 100),
        int(l * 100)
    )


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
