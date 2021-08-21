(() => {
    'use strict';

    const loadImage = document.getElementById('load_image');
    const canvas = document.getElementById('canvas');

    if (!loadImage || !canvas) {
        return;
    }

    const canvasContext = canvas.getContext('2d', { willReadFrequently: true });

    if (!canvasContext) {
        return;
    }

    const controls = {
        exposure: document.getElementById('exposure'),
        contrast: document.getElementById('contrast'),
        blurRadius: document.getElementById('blur_radius'),
        blurStrength: document.getElementById('blur_strength'),
        sharpenStrength: document.getElementById('sharpen_strength'),
        color: document.getElementById('color_picker'),
        colorOpacity: document.getElementById('color_opacity')
    };
    const saveImageModal = document.getElementById('save_image_modal');
    const modalSaveButton = document.getElementById('modal_save_btn');
    const modalCloseButton = document.getElementById('modal_close_btn');
    const modalCancelButton = document.getElementById('modal_cancel_btn');
    const imageFormatDropdown = document.getElementById('image_format');
    const imageCompression = document.getElementById('image_compression');
    const imageCompressionLabel = document.getElementById('image_compression_label');
    const openSaveButton = document.getElementById('open_save_dialogue');
    const clearAllButton = document.getElementById('clear_all');
    const newImageButton = document.getElementById('new_image');
    const exposureButton = document.getElementById('exposure-slider-cta');
    const contrastButton = document.getElementById('contrast-slider-cta');
    const exposurePanel = document.getElementById('exposure-slider');
    const contrastPanel = document.getElementById('contrast-slider');
    const shapes = [];
    const state = {
        brightness: 1,
        contrast: 1,
        blur: 0,
        sharpen: 0,
        color: controls.color?.value || '#ffffff',
        colorOpacity: 0
    };
    let image;
    let imageObjectUrl;
    let originalFileName = 'image';
    let shapeRenderer = () => {};

    function listen(element, eventName, listener) {
        element?.addEventListener(eventName, listener);
    }

    function numberValue(element, fallback = 0) {
        const value = Number(element?.value);
        return Number.isFinite(value) ? value : fallback;
    }

    function resetState() {
        state.brightness = 1;
        state.contrast = 1;
        state.blur = 0;
        state.sharpen = 0;
        state.color = controls.color?.defaultValue || '#ffffff';
        state.colorOpacity = 0;
        shapes.length = 0;

        Object.values(controls).forEach(control => {
            if (control) {
                control.value = control.defaultValue;
            }
        });

        window.dispatchEvent(new Event('photoeditor:clear'));
    }

    function formatFilters() {
        return [
            `brightness(${state.brightness})`,
            `contrast(${state.contrast})`,
            `blur(${state.blur}px)`
        ].join(' ');
    }

    function applySharpen() {
        if (state.sharpen <= 0 || canvas.width === 0 || canvas.height === 0) {
            return;
        }

        const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
        const source = new Uint8ClampedArray(imageData.data);
        const destination = imageData.data;
        const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];

        for (let y = 0; y < canvas.height; y += 1) {
            for (let x = 0; x < canvas.width; x += 1) {
                const destinationOffset = (y * canvas.width + x) * 4;
                const sharpened = [0, 0, 0];

                for (let kernelY = -1; kernelY <= 1; kernelY += 1) {
                    for (let kernelX = -1; kernelX <= 1; kernelX += 1) {
                        const sourceX = Math.min(canvas.width - 1, Math.max(0, x + kernelX));
                        const sourceY = Math.min(canvas.height - 1, Math.max(0, y + kernelY));
                        const sourceOffset = (sourceY * canvas.width + sourceX) * 4;
                        const weight = weights[(kernelY + 1) * 3 + kernelX + 1];

                        sharpened[0] += source[sourceOffset] * weight;
                        sharpened[1] += source[sourceOffset + 1] * weight;
                        sharpened[2] += source[sourceOffset + 2] * weight;
                    }
                }

                for (let channel = 0; channel < 3; channel += 1) {
                    destination[destinationOffset + channel] =
                        sharpened[channel] * state.sharpen +
                        source[destinationOffset + channel] * (1 - state.sharpen);
                }

                destination[destinationOffset + 3] = source[destinationOffset + 3];
            }
        }

        canvasContext.putImageData(imageData, 0, 0);
    }

    function renderImage() {
        if (!image) {
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        canvasContext.save();
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        canvasContext.globalAlpha = 1;
        canvasContext.globalCompositeOperation = 'source-over';
        canvasContext.filter = formatFilters();
        canvasContext.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvasContext.restore();

        applySharpen();

        if (state.colorOpacity > 0) {
            canvasContext.save();
            canvasContext.filter = 'none';
            canvasContext.globalAlpha = state.colorOpacity;
            canvasContext.globalCompositeOperation = 'source-atop';
            canvasContext.fillStyle = state.color;
            canvasContext.fillRect(0, 0, canvas.width, canvas.height);
            canvasContext.restore();
        }

        shapeRenderer(canvasContext, shapes);
    }

    function closeModal() {
        if (saveImageModal) {
            saveImageModal.style.display = 'none';
        }
    }

    function updateCompressionVisibility() {
        if (!imageCompressionLabel || !imageFormatDropdown) {
            return;
        }

        imageCompressionLabel.style.display =
            imageFormatDropdown.value === 'jpeg' || imageFormatDropdown.value === 'webp'
                ? ''
                : 'none';
    }

    function downloadImage(imageUrl, fileExtension) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${originalFileName}_jsphotoeditor.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function saveImage() {
        if (!image || !imageFormatDropdown) {
            return;
        }

        const imageFormat = imageFormatDropdown.value;
        const mimeTypes = {
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp'
        };
        const mimeType = mimeTypes[imageFormat] || mimeTypes.png;
        const quality = Math.min(1, Math.max(0, numberValue(imageCompression, 1)));
        const imageUrl =
            imageFormat === 'jpeg' || imageFormat === 'webp'
                ? canvas.toDataURL(mimeType, quality)
                : canvas.toDataURL(mimeType);

        downloadImage(imageUrl, imageFormat);
        closeModal();
    }

    function clearImage() {
        if (imageObjectUrl) {
            URL.revokeObjectURL(imageObjectUrl);
        }

        image = undefined;
        imageObjectUrl = undefined;
        originalFileName = 'image';
        loadImage.value = '';
        resetState();
        canvas.width = 0;
        canvas.height = 0;
        closeModal();
    }

    function loadSelectedImage() {
        const file = loadImage.files?.[0];

        if (!file || !file.type.startsWith('image/')) {
            return;
        }

        const nextImage = new Image();
        const nextObjectUrl = URL.createObjectURL(file);

        nextImage.onload = () => {
            if (imageObjectUrl) {
                URL.revokeObjectURL(imageObjectUrl);
            }

            image = nextImage;
            imageObjectUrl = nextObjectUrl;
            originalFileName = file.name.replace(/\.[^./\\]+$/, '') || 'image';
            canvas.width = nextImage.naturalWidth;
            canvas.height = nextImage.naturalHeight;
            resetState();
            renderImage();
        };

        nextImage.onerror = () => {
            URL.revokeObjectURL(nextObjectUrl);
            loadImage.value = '';
        };

        nextImage.src = nextObjectUrl;
    }

    function togglePanel(panelToOpen, panelToClose) {
        panelToClose?.classList.add('hidden');
        panelToOpen?.classList.toggle('hidden');
    }

    listen(loadImage, 'change', loadSelectedImage);
    listen(exposureButton, 'click', () => togglePanel(exposurePanel, contrastPanel));
    listen(contrastButton, 'click', () => togglePanel(contrastPanel, exposurePanel));
    listen(imageFormatDropdown, 'change', updateCompressionVisibility);
    listen(openSaveButton, 'click', () => {
        if (image && saveImageModal) {
            saveImageModal.style.display = 'block';
        }
    });
    listen(modalCloseButton, 'click', closeModal);
    listen(modalCancelButton, 'click', closeModal);
    listen(modalSaveButton, 'click', saveImage);
    listen(saveImageModal, 'click', event => {
        if (event.target === saveImageModal) {
            closeModal();
        }
    });
    listen(document, 'keydown', event => {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    listen(controls.exposure, 'input', () => {
        if (!image) {
            return;
        }

        state.brightness = Math.max(0, 1 + numberValue(controls.exposure) / 100);
        renderImage();
    });
    listen(controls.contrast, 'input', () => {
        if (!image) {
            return;
        }

        state.contrast = Math.max(0, 1 + numberValue(controls.contrast) / 100);
        renderImage();
    });

    const updateBlur = () => {
        if (!image) {
            return;
        }

        state.blur =
            numberValue(controls.blurRadius) * (numberValue(controls.blurStrength) / 100);
        renderImage();
    };

    listen(controls.blurRadius, 'input', updateBlur);
    listen(controls.blurStrength, 'input', updateBlur);
    listen(controls.sharpenStrength, 'input', () => {
        if (!image) {
            return;
        }

        state.sharpen = numberValue(controls.sharpenStrength) / 100;
        renderImage();
    });

    const updateColor = () => {
        if (!image) {
            return;
        }

        state.color = controls.color?.value || '#ffffff';
        state.colorOpacity = numberValue(controls.colorOpacity) / 100;
        renderImage();
    };

    listen(controls.color, 'input', updateColor);
    listen(controls.colorOpacity, 'input', updateColor);
    listen(clearAllButton, 'click', () => {
        if (!image) {
            return;
        }

        resetState();
        renderImage();
    });
    listen(newImageButton, 'click', clearImage);
    listen(window, 'beforeunload', () => {
        if (imageObjectUrl) {
            URL.revokeObjectURL(imageObjectUrl);
        }
    });

    window.photoEditor = {
        addShape(shape) {
            if (image) {
                shapes.push(shape);
                renderImage();
            }
        },
        canvas,
        hasImage() {
            return Boolean(image);
        },
        render: renderImage,
        setShapeRenderer(renderer) {
            shapeRenderer = renderer;
            renderImage();
        }
    };

    updateCompressionVisibility();
})();
