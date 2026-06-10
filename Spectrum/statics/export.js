// export.js — Download triggers and API endpoint copy

const ExportManager = (() => {

  function downloadFile(format) {
    const btn = document.getElementById(`export-${format}`);
    const orig = btn.textContent;
    btn.textContent = "Preparing…";
    btn.disabled = true;

    const link = document.createElement("a");
    link.href = `/export?format=${format}`;
    link.download = format === "excel" ? "spectra_export.xlsx" : "spectra_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      btn.textContent = orig;
      btn.disabled = false;
    }, 2000);
  }

  function copyApiEndpoint() {
    const endpoint = `${window.location.origin}/export?format=csv`;
    navigator.clipboard.writeText(endpoint).then(() => {
      const btn = document.getElementById("copy-api");
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = orig, 2000);
    });
  }

  function bindButtons() {
    document.getElementById("export-csv").addEventListener("click", () => downloadFile("csv"));
    document.getElementById("export-excel").addEventListener("click", () => downloadFile("excel"));
    document.getElementById("copy-api").addEventListener("click", copyApiEndpoint);
  }

  return { bindButtons };
})();
