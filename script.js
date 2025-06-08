    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("cropOverlay");
    const overlayCtx = overlay.getContext("2d");
    const upload = document.getElementById("upload");
    let originalImage = null;
    let fullImage = null; // Keep the un-cropped source so crop can be adjusted
    let history = [];
    let historyIndex = -1;
    let image = new Image();

    // Cropping state
    let croppingMode = false;
    let cropStart = null;

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
          overlay.width = canvas.width;
          overlay.height = canvas.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
          fullImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

    // Enable cropping mode
    function startCrop() {
      croppingMode = true;
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      drawCropOverlay(0, 0, canvas.width, canvas.height);
    }

    function drawCropOverlay(x1, y1, x2, y2) {
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);

      overlayCtx.fillStyle = "rgba(0,0,0,0.5)";
      overlayCtx.fillRect(0, 0, overlay.width, overlay.height);
      overlayCtx.clearRect(left, top, width, height);

      overlayCtx.strokeStyle = "#fff";
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(left, top, width, height);

      overlayCtx.lineWidth = 1;
      overlayCtx.beginPath();
      overlayCtx.moveTo(left + width / 3, top);
      overlayCtx.lineTo(left + width / 3, top + height);
      overlayCtx.moveTo(left + (2 * width) / 3, top);
      overlayCtx.lineTo(left + (2 * width) / 3, top + height);
      overlayCtx.moveTo(left, top + height / 3);
      overlayCtx.lineTo(left + width, top + height / 3);
      overlayCtx.moveTo(left, top + (2 * height) / 3);
      overlayCtx.lineTo(left + width, top + (2 * height) / 3);
      overlayCtx.stroke();

      const c = 10;
      overlayCtx.beginPath();
      overlayCtx.moveTo(left, top + c);
      overlayCtx.lineTo(left, top);
      overlayCtx.lineTo(left + c, top);

      overlayCtx.moveTo(left + width - c, top);
      overlayCtx.lineTo(left + width, top);
      overlayCtx.lineTo(left + width, top + c);

      overlayCtx.moveTo(left, top + height - c);
      overlayCtx.lineTo(left, top + height);
      overlayCtx.lineTo(left + c, top + height);

      overlayCtx.moveTo(left + width - c, top + height);
      overlayCtx.lineTo(left + width, top + height);
      overlayCtx.lineTo(left + width, top + height - c);
      overlayCtx.stroke();
    }

    function cropImage(x1, y1, x2, y2) {
      if (!fullImage) return;
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      if (width === 0 || height === 0) return;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = fullImage.width;
      tempCanvas.height = fullImage.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.putImageData(fullImage, 0, 0);
      const cropped = tempCtx.getImageData(left, top, width, height);

      canvas.width = width;
      canvas.height = height;
      overlay.width = width;
      overlay.height = height;
      originalImage = new ImageData(new Uint8ClampedArray(cropped.data), width, height);
      applyEdits();
      saveHistory();
    }

    function resetCrop() {
      if (!fullImage) return;
      originalImage = new ImageData(new Uint8ClampedArray(fullImage.data), fullImage.width, fullImage.height);
      canvas.width = fullImage.width;
      canvas.height = fullImage.height;
      overlay.width = fullImage.width;
      overlay.height = fullImage.height;
      applyEdits();
      saveHistory();
    }

    canvas.addEventListener("mousedown", (e) => {
      if (!croppingMode) return;
      const rect = canvas.getBoundingClientRect();
      cropStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!croppingMode || !cropStart) return;
      const rect = canvas.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      drawCropOverlay(cropStart.x, cropStart.y, curX, curY);
    });

    canvas.addEventListener("mouseup", (e) => {
      if (!croppingMode || !cropStart) return;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      cropImage(cropStart.x, cropStart.y, endX, endY);
      cropStart = null;
      croppingMode = false;
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    });

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

