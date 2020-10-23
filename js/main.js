let filters = {};
let image = new Image();
const loadImage = document.getElementById('load_image');
const canvas = document.getElementById('canvas');
let canvasContext = canvas.getContext('2d');

// Load Image from Upload File
loadImage.addEventListener('change', e => {
    let file = loadImage.files[0];
    image.src = URL.createObjectURL(file);
    image.onload = () => {
        canvas.height = image.naturalHeight;
        canvas.width = image.naturalWidth;
        canvasContext.drawImage(image, 0, 0);
    }
});

// Exposure
const exposureSlider = document.getElementById('exposure');
exposureSlider.addEventListener('change', () => {
    if (!image.src) return;
    filters['brightness'] = 1 + (1 * exposureSlider.value / 100);
    redrawImage();
});

// Contrast
const contrastSlider = document.getElementById('contrast');
contrastSlider.addEventListener('change', () => {
    if (!image.src) return;
    filters['contrast'] = 1 + (1 * contrastSlider.value / 100);
    redrawImage();
});

// Blur
const blurRadius = document.getElementById('blur_radius');
const blurStrength = document.getElementById('blur_strength');
blurRadius.addEventListener('change', blurChanged);
blurStrength.addEventListener('change', blurChanged);
function blurChanged() {
    if (!image.src) return;
    filters['blur'] = Math.round(blurRadius.value / 1000 * blurStrength.value);
    redrawImage();
}

// Sharpen
// Modified From: https://gist.github.com/mikecao/65d9fc92dc7197cb8a7c
const sharpenStrength = document.getElementById('sharpen_strength');
sharpenStrength.addEventListener('change', () => {
    if (!image.src) return;
    let strength = sharpenStrength.value / 100;
    let w = image.width, h = image.height;
    let x, sx, sy, r, g, b, dstOff, srcOff, wt, cx, cy, scy, scx,
        weights = [0, -1, 0, -1, 5, -1, 0, -1, 0],
        katet = Math.round(Math.sqrt(weights.length)),
        half = (katet * 0.5) | 0,
        dstData = canvasContext.getImageData(0, 0, w, h),
        dstBuff = dstData.data,
        srcBuff = canvasContext.getImageData(0, 0, w, h).data,
        y = h;

    while (y--) {
        x = w;
        while (x--) {
            sy = y;
            sx = x;
            dstOff = (y * w + x) * 4;
            r = 0;
            g = 0;
            b = 0;
            a = 0;

            for (cy = 0; cy < katet; cy++) {
                for (cx = 0; cx < katet; cx++) {
                    scy = sy + cy - half;
                    scx = sx + cx - half;

                    if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                        srcOff = (scy * w + scx) * 4;
                        wt = weights[cy * katet + cx];

                        r += srcBuff[srcOff] * wt;
                        g += srcBuff[srcOff + 1] * wt;
                        b += srcBuff[srcOff + 2] * wt;
                        a += srcBuff[srcOff + 3] * wt;
                    }
                }
            }

            dstBuff[dstOff] = r * strength + srcBuff[dstOff] * (1 - strength);
            dstBuff[dstOff + 1] = g * strength + srcBuff[dstOff + 1] * (1 - strength);
            dstBuff[dstOff + 2] = b * strength + srcBuff[dstOff + 2] * (1 - strength);
            dstBuff[dstOff + 3] = srcBuff[dstOff + 3];
        }
    }

    canvasContext.putImageData(dstData, 0, 0);
});

// Color Filter
const colorPicker = document.getElementById('color_picker');
const colorOpacity = document.getElementById('color_opacity');
colorPicker.addEventListener('change', colorChanged);
colorOpacity.addEventListener('change', colorChanged);
function colorChanged() {
    if (!image.src) return;
    canvasContext.fillStyle = colorPicker.value;
    canvasContext.globalAlpha = colorOpacity.value / 100;
    canvasContext.fillRect(0, 0, image.width, image.height);
    redrawImage();
}

// Clear all image modifications.
const clearAllButton = document.getElementById('clear_all').addEventListener('click', () => {
});

// Returns Unit. By default all percentage-based unit is normalised in each tool.
function getUnit(key) {
    if (key == 'blur') {
        return 'px';
    }
    return '';
}

// Returns the formatted context filter string.
function formatFilters(filters) {
    let filterString = '';
    for (const filter in filters) {
        filterString += `${filter}(${filters[filter]}${getUnit(filter)}) `;
    }
    console.log(filterString);
    return filterString;
}

// Redraws image after applying filters.
function redrawImage() {
    canvasContext.filter = formatFilters(filters);
    canvasContext.drawImage(image, 0, 0);
}
