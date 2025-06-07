    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const upload = document.getElementById("upload");
    let originalImage = null;
    let history = [];
    let historyIndex = -1;
    let image = new Image();

    const curveCanvas = document.getElementById("curveCanvas");
    const curveCtx = curveCanvas.getContext("2d");
    const curvePoints = Array.from({ length: 5 }, (_, i) => [i * 64, 256 - i * 64]);

    function drawCurve() {
      curveCtx.clearRect(0, 0, 256, 256);
      curveCtx.strokeStyle = "#eee";
      for (let i = 0; i <= 256; i += 64) {
        curveCtx.beginPath();
        curveCtx.moveTo(i, 0);
        curveCtx.lineTo(i, 256);
        curveCtx.stroke();
        curveCtx.beginPath();
        curveCtx.moveTo(0, i);
        curveCtx.lineTo(256, i);
        curveCtx.stroke();
      }
      curveCtx.beginPath();
      curveCtx.moveTo(curvePoints[0][0], curvePoints[0][1]);
      for (let i = 1; i < curvePoints.length; i++) {
        curveCtx.lineTo(curvePoints[i][0], curvePoints[i][1]);
      }
      curveCtx.strokeStyle = "#000";
      curveCtx.lineWidth = 2;
      curveCtx.stroke();
      curveCtx.fillStyle = "#f00";
      for (const [x, y] of curvePoints) {
        curveCtx.beginPath();
        curveCtx.arc(x, y, 5, 0, Math.PI * 2);
        curveCtx.fill();
      }
    }

    let draggingPoint = null;
    curveCanvas.addEventListener("mousedown", (e) => {
      const rect = curveCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let i = 0; i < curvePoints.length; i++) {
        const [px, py] = curvePoints[i];
        if (Math.hypot(x - px, y - py) < 8) {
          draggingPoint = i;
          break;
        }
      }
    });
    curveCanvas.addEventListener("mousemove", (e) => {
      if (draggingPoint !== null) {
        const rect = curveCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        x = Math.max(0, Math.min(255, x));
        y = Math.max(0, Math.min(255, y));
        curvePoints[draggingPoint][1] = y;
        drawCurve();
        applyEdits();
      }
    });
    curveCanvas.addEventListener("mouseup", () => (draggingPoint = null));
    curveCanvas.addEventListener("mouseleave", () => (draggingPoint = null));

    drawCurve();

    upload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          const maxWidth = 300;
          const scale = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scale;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
          saveHistory();
          applyEdits();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    function saveHistory() {
      if (!originalImage) return;
      if (history.length >= 10) history.shift();
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      history.push(snapshot);
      historyIndex = history.length - 1;
    }

    function undoEdit() {
      if (historyIndex > 0) {
        historyIndex--;
        ctx.putImageData(history[historyIndex], 0, 0);
      }
    }

    function redoEdit() {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        ctx.putImageData(history[historyIndex], 0, 0);
      }
    }

    function resetEdits() {
      if (originalImage) {
        ctx.putImageData(originalImage, 0, 0);
        saveHistory();
      }
    }

    function toggleBeforeAfter() {
      if (!originalImage) return;
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.putImageData(originalImage, 0, 0);
      originalImage = current;
    }

    function exportImage(type) {
      const link = document.createElement("a");
      link.download = `edited-image.${type}`;
      link.href = canvas.toDataURL(`image/${type}`);
      link.click();
    }

    function applyEdits() {
      if (!originalImage) return;

      const brightness = +document.getElementById("brightness").value;
      const contrast = +document.getElementById("contrast").value;
      const exposure = +document.getElementById("exposure").value;
      const highlights = +document.getElementById("highlights").value;
      const shadows = +document.getElementById("shadows").value;
      const whites = +document.getElementById("whites").value;
      const blacks = +document.getElementById("blacks").value;
      const vibrance = +document.getElementById("vibrance").value;
      const saturation = +document.getElementById("saturation").value;

      const imgData = new ImageData(
        new Uint8ClampedArray(originalImage.data),
        originalImage.width,
        originalImage.height
      );
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        const avg = (r + g + b) / 3;

        if (avg > 200) {
          r += highlights;
          g += highlights;
          b += highlights;
        }

        if (avg < 55) {
          r += shadows;
          g += shadows;
          b += shadows;
        }

        if (r > 225) r += whites;
        if (g > 225) g += whites;
        if (b > 225) b += whites;

        if (r < 30) r += blacks;
        if (g < 30) g += blacks;
        if (b < 30) b += blacks;

        r += brightness;
        g += brightness;
        b += brightness;

        r = (r - 128) * (contrast / 100 + 1) + 128;
        g = (g - 128) * (contrast / 100 + 1) + 128;
        b = (b - 128) * (contrast / 100 + 1) + 128;

        r += exposure;
        g += exposure;
        b += exposure;

        // Vibrance adjustment
        const maxColor = Math.max(r, g, b);
        const intensity = (r + g + b) / 3;
        const vibranceFactor = (maxColor - intensity) / 255;
        const vibranceBoost = (vibrance * vibranceFactor) / 100;

        r += (r - intensity) * vibranceBoost;
        g += (g - intensity) * vibranceBoost;
        b += (b - intensity) * vibranceBoost;

        // Saturation adjustment
        const avgSat = (r + g + b) / 3;
        r = avgSat + (r - avgSat) * (1 + saturation / 100);
        g = avgSat + (g - avgSat) * (1 + saturation / 100);
        b = avgSat + (b - avgSat) * (1 + saturation / 100);

        // Tone Curve
        const curveMap = getLuminanceCurveMap();
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const adj = curveMap[Math.max(0, Math.min(255, Math.round(lum)))];
        const scale = adj / (lum + 1);

        data[i] = Math.min(255, Math.max(0, r * scale));
        data[i + 1] = Math.min(255, Math.max(0, g * scale));
        data[i + 2] = Math.min(255, Math.max(0, b * scale));
      }

      ctx.putImageData(imgData, 0, 0);
    }

    function getLuminanceCurveMap() {
      const map = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        const x = i;
        let y = x;
        for (let j = 1; j < curvePoints.length; j++) {
          const [x1, y1] = curvePoints[j - 1];
          const [x2, y2] = curvePoints[j];
          if (x >= x1 && x <= x2) {
            const t = (x - x1) / (x2 - x1);
            y = (1 - t) * y1 + t * y2;
            break;
          }
        }
        map[i] = 255 - Math.round(y);
      }
      return map;
    }

    // Debounce input for performance
    let debounceTimer;
    function debounceApplyEdits() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyEdits, 50);
    }

const slider = document.getElementById('vignetteSlider');
const ctx = canvas.getContext('2d');

// Assume you have your image already drawn on the canvas.

slider.addEventListener('input', () => {
  applyVignette(canvas, parseFloat(slider.value));
});

function applyVignette(canvas, intensity = 0.5) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.globalCompositeOperation = 'source-over';

  // Clear and redraw your original image here if needed
  // ctx.clearRect(0, 0, width, height);
  // ctx.drawImage(yourImage, 0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) / 2 * (1 - intensity),
    width / 2, height / 2, Math.min(width, height) / 2
  );

  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.8)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}


    // Attach input listeners
    [
      "brightness",
      "contrast",
      "exposure",
      "highlights",
      "shadows",
      "whites",
      "blacks",
      "vibrance",
      "saturation",
    ].forEach((id) =>
      document.getElementById(id).addEventListener("input", debounceApplyEdits)
    );

