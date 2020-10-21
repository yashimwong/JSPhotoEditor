const loadImage = document.getElementById('load_image');
const canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let image = new Image();
let filters = {};

canvas.addEventListener('change', () => {
    console.log(canvas.context);
});

// Load Image from Upload File
loadImage.addEventListener('change', e => {
    let file = loadImage.files[0];
    image.src = URL.createObjectURL(file);
    image.onload = () => {
        canvas.height = image.naturalHeight;
        canvas.width = image.naturalWidth;
        context.drawImage(image, 0, 0);
    }
});

// Exposure
const exposureSlider = document.getElementById('exposure');
exposureSlider.addEventListener('change', () => {
    filters['brightness'] = 1 + (1 * exposureSlider.value / 100);
    redrawImage();
});

// Contrast
const contrastSlider = document.getElementById('contrast');
contrastSlider.addEventListener('change', () => {
    filters['contrast'] = 1 + (1 * contrastSlider.value / 100);
    redrawImage();
});

// Blur
const blurRadius = document.getElementById('blur_radius');
const blurStrength = document.getElementById('blur_strength');
blurRadius.addEventListener('change', blurChanged);
blurStrength.addEventListener('change', blurChanged);
function blurChanged() {
    filters['blur'] = Math.round(blurRadius.value / 1000 * blurStrength.value);
    redrawImage();
}

// Sharpen [Incomplete]
const sharpenRadius = document.getElementById('sharpen_radius');
const sharpenStrength = document.getElementById('sharpen_strength');
sharpenRadius.addEventListener('change', sharpenChanged);
sharpenStrength.addEventListener('change', sharpenChanged);
function sharpenChanged() {
    let blur = filters['blur'];
    if (typeof blur !== "undefined" && parseInt(blur) <= 4) {
        blur = 4 * (1 + sharpenRadius.value / 100 );
    }
    let contrast = filters['contrast'];
    if (typeof contrast !== "undefined" && parseInt(contrast) <= 0.75) {
        contrast = 0.75 * (1 * sharpenStrength);
    }
    filters['invert'] = 1;
    redrawImage();
}

// Returns Unit. By default all percentage-based unit is normalised in each tool.
function getUnit(key) {
    if (key == 'blur') {
        return 'px';
    }
    return '';
}

// Redraws image after applying filters
function redrawImage() {
    let formattedFilters = '';
    for (const filter in filters) {
        formattedFilters += `${filter}(${filters[filter]}${getUnit(filter)})`;
    }
    context.filter = formattedFilters;
    context.drawImage(image, 0, 0);
}


