const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = '1 (2).png';
const upload = document.getElementById('upload');
const controls = document.getElementById('controls');
const beforeAfterBtn = document.getElementById('beforeAfter');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const cropBtn = document.getElementById('cropBtn');
const applyCropBtn = document.getElementById('applyCrop');
const rotateLeftBtn = document.getElementById('rotateLeft');
const rotateRightBtn = document.getElementById('rotateRight');
const flipHBtn = document.getElementById('flipH');
const flipVBtn = document.getElementById('flipV');
const formatSelect = document.getElementById('format');
const resolutionInput = document.getElementById('resolution');
const downloadBtn = document.getElementById('download');
const cropContainer = document.getElementById('crop-container');
const cropperImage = document.getElementById('cropper-image');

const sliderIds = [
  'brightness','contrast','exposure','temperature','tint','clarity','sharpen',
  'highlights','shadows','blacks','whites','vibrance','hue','saturation',
  'lightness','dehaze','grain','vignette'
];
const sliders = {};
sliderIds.forEach(id => sliders[id] = document.getElementById(id));

let camanInstance;
let cropper;
let originalData;
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
  history = history.slice(0, historyIndex + 1);
  history.push(canvas.toDataURL('image/png'));
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
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0);
    camanInstance = Caman(canvas, function(){});
  };
  img.src = history[index];
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
function applyFilters(noHistory=false) {
  if (!camanInstance) return;
  camanInstance.revert(false);
  camanInstance.brightness(parseInt(sliders.brightness.value));
  camanInstance.contrast(parseInt(sliders.contrast.value));
  camanInstance.exposure(parseInt(sliders.exposure.value));
  camanInstance.vibrance(parseInt(sliders.vibrance.value));
  camanInstance.saturation(parseInt(sliders.saturation.value));
  camanInstance.hue(parseInt(sliders.hue.value));
  camanInstance.gamma(1 + parseInt(sliders.lightness.value)/100);
  camanInstance.sharpen(parseInt(sliders.sharpen.value));
  camanInstance.noise(parseInt(sliders.grain.value));
  if (parseInt(sliders.vignette.value) > 0) camanInstance.vignette('50%', parseInt(sliders.vignette.value));
  camanInstance.render(() => {
    if (!noHistory) saveState();
  });
}

// Event listeners
upload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img,0,0);
    camanInstance = Caman(canvas, function(){ originalData = this.toBase64(); });
    history = [];
    historyIndex = -1;
    saveState();
    controls.hidden = false;
  };
  img.src = url;
});

sliderIds.forEach(id => sliders[id].addEventListener('input', () => applyFilters()));

beforeAfterBtn.addEventListener('click', () => {
  if (!originalData) return;
  showingOriginal = !showingOriginal;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0);
    if (!showingOriginal) camanInstance = Caman(canvas, function(){});
  };
  img.src = showingOriginal ? originalData : history[historyIndex];
});

undoBtn.addEventListener('click', () => {
  if (historyIndex > 0) {
    historyIndex--;
    restoreState(historyIndex);
  }
});

document.getElementById('brightness').addEventListener('click', () => {
    adjustBrightness(10);
redoBtn.addEventListener('click', () => {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    restoreState(historyIndex);
  }
});

document.getElementById('undo').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(historyIndex);
    }
cropBtn.addEventListener('click', () => {
  cropperImage.src = canvas.toDataURL('image/png');
  cropContainer.style.display = 'block';
  canvas.style.display = 'none';
  cropBtn.hidden = true;
  applyCropBtn.hidden = false;
  cropper = new Cropper(cropperImage, {viewMode:1, aspectRatio: NaN});
});

document.getElementById('redo').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(historyIndex);
    }
applyCropBtn.addEventListener('click', () => {
  const croppedCanvas = cropper.getCroppedCanvas();
  canvas.width = croppedCanvas.width;
  canvas.height = croppedCanvas.height;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(croppedCanvas,0,0);
  camanInstance = Caman(canvas, function(){});
  cropper.destroy();
  cropContainer.style.display = 'none';
  canvas.style.display = 'block';
  cropBtn.hidden = false;
  applyCropBtn.hidden = true;
  saveState();
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
rotateLeftBtn.addEventListener('click', () => {
  rotateCanvas(-90);
});
rotateRightBtn.addEventListener('click', () => {
  rotateCanvas(90);
});
function rotateCanvas(deg){
  const temp = document.createElement('canvas');
  const tctx = temp.getContext('2d');
  temp.width = canvas.height;
  temp.height = canvas.width;
  tctx.translate(temp.width/2,temp.height/2);
  tctx.rotate(deg*Math.PI/180);
  tctx.drawImage(canvas,-canvas.width/2,-canvas.height/2);
  canvas.width = temp.width;
  canvas.height = temp.height;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(temp,0,0);
  camanInstance = Caman(canvas, function(){});
  saveState();
}

flipHBtn.addEventListener('click', () => flipCanvas(true,false));
flipVBtn.addEventListener('click', () => flipCanvas(false,true));
function flipCanvas(horizontal, vertical){
  ctx.save();
  ctx.translate(horizontal?canvas.width:0, vertical?canvas.height:0);
  ctx.scale(horizontal?-1:1, vertical?-1:1);
  const imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.putImageData(imgData,0,0);
  ctx.restore();
  camanInstance = Caman(canvas, function(){});
  saveState();
}

downloadBtn.addEventListener('click', () => {
  const scale = parseInt(resolutionInput.value)/100;
  const temp = document.createElement('canvas');
  temp.width = canvas.width*scale;
  temp.height = canvas.height*scale;
  temp.getContext('2d').drawImage(canvas,0,0,temp.width,temp.height);
  const type = 'image/' + formatSelect.value;
  const link = document.createElement('a');
  link.download = 'edited-image.'+formatSelect.value;
  link.href = temp.toDataURL(type);
  link.click();
});
