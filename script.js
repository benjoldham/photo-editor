const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = '1 (2).png';
let history = [];
let historyIndex = -1;
let showingOriginal = false;
let originalDataUrl;

img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    originalDataUrl = canvas.toDataURL();
    saveState();
};

function saveState() {
    // Remove any redo history
    history = history.slice(0, historyIndex + 1);
    history.push(canvas.toDataURL());
    historyIndex = history.length - 1;
}

function restoreState(index) {
    const dataUrl = history[index];
    const restoreImg = new Image();
    restoreImg.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(restoreImg, 0, 0);
    };
    restoreImg.src = dataUrl;
}

function adjustBrightness(value) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + value);     // R
        data[i + 1] = Math.min(255, data[i + 1] + value); // G
        data[i + 2] = Math.min(255, data[i + 2] + value); // B
    }
    ctx.putImageData(imageData, 0, 0);
    saveState();
}

// Event listeners

document.getElementById('brightness').addEventListener('click', () => {
    adjustBrightness(10);
});

document.getElementById('undo').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(historyIndex);
    }
});

document.getElementById('redo').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(historyIndex);
    }
});

document.getElementById('toggle').addEventListener('click', () => {
    showingOriginal = !showingOriginal;
    const src = showingOriginal ? originalDataUrl : history[historyIndex];
    const tempImg = new Image();
    tempImg.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempImg, 0, 0);
    };
    tempImg.src = src;
});
