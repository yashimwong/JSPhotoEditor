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
        grayscale: document.getElementById('grayscale'),
        saturation: document.getElementById('saturation'),
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
    const rotateLeftButton = document.getElementById('rotate_left');
    const rotateRightButton = document.getElementById('rotate_right');
    const flipHorizontalButton = document.getElementById('flip_horizontal');
    const flipVerticalButton = document.getElementById('flip_vertical');
    const undoButton = document.getElementById('undo');
    const redoButton = document.getElementById('redo');
    const exposureButton = document.getElementById('exposure-slider-cta');
    const contrastButton = document.getElementById('contrast-slider-cta');
    const exposurePanel = document.getElementById('exposure-slider');
    const contrastPanel = document.getElementById('contrast-slider');
    const shapes = [];
    const undoStack = [];
    const redoStack = [];
    const historyLimit = 50;
    const lastControlValues = Object.fromEntries(
        Object.entries(controls).map(([name, control]) => [name, control?.value])
    );
    const state = {
        brightness: 1,
        contrast: 1,
        blur: 0,
        sharpen: 0,
        grayscale: 0,
        saturation: 1,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
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

    function createSnapshot() {
        return {
            controls: { ...lastControlValues },
            shapes: shapes.map(shape => ({ ...shape })),
            state: { ...state }
        };
    }

    function rememberControlValues() {
        Object.entries(controls).forEach(([name, control]) => {
            lastControlValues[name] = control?.value;
        });
    }

    function updateHistoryButtons() {
        if (undoButton) {
            undoButton.disabled = !image || undoStack.length === 0;
        }

        if (redoButton) {
            redoButton.disabled = !image || redoStack.length === 0;
        }
    }

    function clearHistory() {
        undoStack.length = 0;
        redoStack.length = 0;
        updateHistoryButtons();
    }

    function recordHistory() {
        if (!image) {
            return;
        }

        undoStack.push(createSnapshot());

        if (undoStack.length > historyLimit) {
            undoStack.shift();
        }

        redoStack.length = 0;
        updateHistoryButtons();
    }

    function restoreSnapshot(snapshot) {
        Object.assign(state, snapshot.state);
        shapes.splice(0, shapes.length, ...snapshot.shapes.map(shape => ({ ...shape })));

        Object.entries(snapshot.controls).forEach(([name, value]) => {
            if (controls[name] && value !== undefined) {
                controls[name].value = value;
            }
        });

        resizeCanvas();
        renderImage();
        notifyShapesChanged();
    }

    function undo() {
        if (!image || undoStack.length === 0) {
            return false;
        }

        redoStack.push(createSnapshot());
        restoreSnapshot(undoStack.pop());
        updateHistoryButtons();
        return true;
    }

    function redo() {
        if (!image || redoStack.length === 0) {
            return false;
        }

        undoStack.push(createSnapshot());
        restoreSnapshot(redoStack.pop());
        updateHistoryButtons();
        return true;
    }

    function notifyShapesChanged() {
        window.dispatchEvent(
            new CustomEvent('photoeditor:shapeschange', {
                detail: { count: shapes.length }
            })
        );
    }

    function resetState() {
        state.brightness = 1;
        state.contrast = 1;
        state.blur = 0;
        state.sharpen = 0;
        state.grayscale = 0;
        state.saturation = 1;
        state.rotation = 0;
        state.flipHorizontal = false;
        state.flipVertical = false;
        state.color = controls.color?.defaultValue || '#ffffff';
        state.colorOpacity = 0;
        shapes.length = 0;

        Object.values(controls).forEach(control => {
            if (control) {
                control.value = control.defaultValue;
            }
        });

        resizeCanvas();
        notifyShapesChanged();
        window.dispatchEvent(new Event('photoeditor:clear'));
    }

    function resizeCanvas() {
        if (!image) {
            return;
        }

        const turns = state.rotation / 90;
        const swapsDimensions = turns % 2 !== 0;
        canvas.width = swapsDimensions ? image.naturalHeight : image.naturalWidth;
        canvas.height = swapsDimensions ? image.naturalWidth : image.naturalHeight;
    }

    function applyTransform() {
        if (state.flipHorizontal) {
            canvasContext.translate(canvas.width, 0);
            canvasContext.scale(-1, 1);
        }

        if (state.flipVertical) {
            canvasContext.translate(0, canvas.height);
            canvasContext.scale(1, -1);
        }

        if (state.rotation === 90) {
            canvasContext.translate(canvas.width, 0);
            canvasContext.rotate(Math.PI / 2);
        } else if (state.rotation === 180) {
            canvasContext.translate(canvas.width, canvas.height);
            canvasContext.rotate(Math.PI);
        } else if (state.rotation === 270) {
            canvasContext.translate(0, canvas.height);
            canvasContext.rotate(-Math.PI / 2);
        }
    }

    function rotateImage(degrees) {
        if (!image) {
            return;
        }

        recordHistory();
        state.rotation = (state.rotation + degrees + 360) % 360;
        resizeCanvas();
        renderImage();
    }

    function toggleFlip(direction) {
        if (!image) {
            return;
        }

        recordHistory();
        state[direction] = !state[direction];
        renderImage();
    }

    function toImagePoint(point) {
        if (!image) {
            return point;
        }

        const outputPoint = {
            ...point,
            x: state.flipHorizontal ? canvas.width - point.x : point.x,
            y: state.flipVertical ? canvas.height - point.y : point.y
        };

        if (state.rotation === 90) {
            return {
                ...outputPoint,
                x: outputPoint.y,
                y: image.naturalHeight - outputPoint.x
            };
        }

        if (state.rotation === 180) {
            return {
                ...outputPoint,
                x: image.naturalWidth - outputPoint.x,
                y: image.naturalHeight - outputPoint.y
            };
        }

        if (state.rotation === 270) {
            return {
                ...outputPoint,
                x: image.naturalWidth - outputPoint.y,
                y: outputPoint.x
            };
        }

        return outputPoint;
    }

    function formatFilters() {
        return [
            `brightness(${state.brightness})`,
            `contrast(${state.contrast})`,
            `blur(${state.blur}px)`,
            `grayscale(${state.grayscale})`,
            `saturate(${state.saturation})`
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
        applyTransform();
        canvasContext.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
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

        canvasContext.save();
        applyTransform();
        shapeRenderer(canvasContext, shapes);
        canvasContext.restore();
        rememberControlValues();
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
        clearHistory();
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
            resetState();
            clearHistory();
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
    listen(rotateLeftButton, 'click', () => rotateImage(-90));
    listen(rotateRightButton, 'click', () => rotateImage(90));
    listen(flipHorizontalButton, 'click', () => toggleFlip('flipHorizontal'));
    listen(flipVerticalButton, 'click', () => toggleFlip('flipVertical'));
    listen(undoButton, 'click', undo);
    listen(redoButton, 'click', redo);
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

        const commandKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        let handled = false;

        if (commandKey && key === 'z') {
            handled = event.shiftKey ? redo() : undo();
        } else if (event.ctrlKey && key === 'y') {
            handled = redo();
        }

        if (handled) {
            event.preventDefault();
        }
    });
    listen(controls.exposure, 'input', () => {
        if (!image) {
            return;
        }

        recordHistory();
        state.brightness = Math.max(0, 1 + numberValue(controls.exposure) / 100);
        renderImage();
    });
    listen(controls.contrast, 'input', () => {
        if (!image) {
            return;
        }

        recordHistory();
        state.contrast = Math.max(0, 1 + numberValue(controls.contrast) / 100);
        renderImage();
    });

    const updateBlur = () => {
        if (!image) {
            return;
        }

        recordHistory();
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

        recordHistory();
        state.sharpen = numberValue(controls.sharpenStrength) / 100;
        renderImage();
    });
    listen(controls.grayscale, 'input', () => {
        if (!image) {
            return;
        }

        recordHistory();
        state.grayscale = numberValue(controls.grayscale) / 100;
        renderImage();
    });
    listen(controls.saturation, 'input', () => {
        if (!image) {
            return;
        }

        recordHistory();
        state.saturation = numberValue(controls.saturation, 100) / 100;
        renderImage();
    });

    const updateColor = () => {
        if (!image) {
            return;
        }

        recordHistory();
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

        recordHistory();
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
                recordHistory();
                shapes.push(shape);
                renderImage();
                notifyShapesChanged();
            }
        },
        canvas,
        getShapeCount() {
            return shapes.length;
        },
        hasImage() {
            return Boolean(image);
        },
        removeLastShape() {
            if (!image || shapes.length === 0) {
                return false;
            }

            recordHistory();
            shapes.pop();
            renderImage();
            notifyShapesChanged();
            return true;
        },
        render: renderImage,
        setShapeRenderer(renderer) {
            shapeRenderer = renderer;
            renderImage();
        },
        toImagePoint
    };

    updateCompressionVisibility();
    updateHistoryButtons();
})();
