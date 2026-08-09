import { JSPhotoEditor } from '../src/index.js';
import type { Adjustments, EditorState, ShapeType } from '../src/index.js';

declare global {
    interface Window {
        photoEditor: JSPhotoEditor;
    }
}

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas');

if (!canvasElement) {
    throw new Error('The demo requires a canvas');
}

const canvas: HTMLCanvasElement = canvasElement;
const editor = new JSPhotoEditor({ canvas });
window.photoEditor = editor;

const element = <ElementType extends HTMLElement>(id: string): ElementType | null =>
    document.querySelector<ElementType>(`#${id}`);
const listen = <EventName extends keyof HTMLElementEventMap>(
    target: HTMLElement | null,
    eventName: EventName,
    listener: (event: HTMLElementEventMap[EventName]) => void
): void => {
    target?.addEventListener(eventName, listener as EventListener);
};
const numberValue = (control: HTMLInputElement | null, fallback = 0): number => {
    const value = Number(control?.value);
    return Number.isFinite(value) ? value : fallback;
};

const controls = {
    blurRadius: element<HTMLInputElement>('blur_radius'),
    blurStrength: element<HTMLInputElement>('blur_strength'),
    color: element<HTMLInputElement>('color_picker'),
    colorOpacity: element<HTMLInputElement>('color_opacity'),
    contrast: element<HTMLInputElement>('contrast'),
    exposure: element<HTMLInputElement>('exposure'),
    grayscale: element<HTMLInputElement>('grayscale'),
    saturation: element<HTMLInputElement>('saturation'),
    sharpen: element<HTMLInputElement>('sharpen_strength')
};
const imageInput = element<HTMLInputElement>('load_image');
const undoButton = element<HTMLButtonElement>('undo');
const redoButton = element<HTMLButtonElement>('redo');
const saveModal = element<HTMLElement>('save_image_modal');
const formatControl = element<HTMLSelectElement>('image_format');
const qualityControl = element<HTMLInputElement>('image_compression');
const qualityLabel = element<HTMLElement>('image_compression_label');
const shapeColor = element<HTMLInputElement>('shape_color');
const shapeOpacity = element<HTMLInputElement>('shape_opacity');
const shapeSize = element<HTMLInputElement>('shape_size');
const removeShapeButton = element<HTMLButtonElement>('remove_last_shape');
const shapeTools = [
    element<HTMLElement>('circle_tool'),
    element<HTMLElement>('rectangle_tool'),
    element<HTMLElement>('triangle_tool')
].filter((tool): tool is HTMLElement => Boolean(tool));
let activeShape: ShapeType | undefined;

function updateHistoryButtons(): void {
    if (undoButton) {
        undoButton.disabled = !editor.hasImage() || !editor.canUndo;
    }

    if (redoButton) {
        redoButton.disabled = !editor.hasImage() || !editor.canRedo;
    }
}

function updateShapeButton(): void {
    if (removeShapeButton) {
        removeShapeButton.disabled = editor.shapeCount === 0;
    }
}

function updateAdjustmentControls(state: EditorState): void {
    const { adjustments } = state;
    const assignments: Array<[HTMLInputElement | null, number | string]> = [
        [controls.exposure, (adjustments.brightness - 1) * 100],
        [controls.contrast, (adjustments.contrast - 1) * 100],
        [controls.sharpen, adjustments.sharpen * 100],
        [controls.grayscale, adjustments.grayscale * 100],
        [controls.saturation, adjustments.saturation * 100],
        [controls.color, adjustments.overlayColor],
        [controls.colorOpacity, adjustments.overlayOpacity * 100]
    ];

    for (const [control, value] of assignments) {
        if (control) {
            control.value = String(value);
        }
    }

    if (controls.blurRadius && controls.blurStrength) {
        const radius = numberValue(controls.blurRadius);
        controls.blurStrength.value = radius === 0 ? '0' : String((adjustments.blur / radius) * 100);
    }
}

function deactivateShapes(): void {
    activeShape = undefined;
    shapeTools.forEach(tool => tool.classList.remove('activated'));
}

function toggleShape(tool: HTMLElement): void {
    if (!editor.hasImage()) {
        return;
    }

    const shape = tool.dataset.shape;

    if (shape !== 'circle' && shape !== 'rectangle' && shape !== 'triangle') {
        return;
    }

    const shouldDeactivate = activeShape === shape;
    deactivateShapes();

    if (!shouldDeactivate) {
        activeShape = shape;
        tool.classList.add('activated');
    }
}

function addShape(event: MouseEvent): void {
    if (!activeShape || !editor.hasImage()) {
        return;
    }

    const rectangle = canvas.getBoundingClientRect();
    const scaleX = rectangle.width ? canvas.width / rectangle.width : 1;
    const scaleY = rectangle.height ? canvas.height / rectangle.height : 1;
    const point = editor.toImagePoint({
        x: (event.clientX - rectangle.left) * scaleX,
        y: (event.clientY - rectangle.top) * scaleY
    });
    const scale = (scaleX + scaleY) / 2;
    const size = Math.min(2, Math.max(0.1, numberValue(shapeSize, 100) / 100));
    const base = {
        color: shapeColor?.value || '#111827',
        opacity: Math.min(1, Math.max(0, numberValue(shapeOpacity, 100) / 100)),
        x: point.x,
        y: point.y
    };

    if (activeShape === 'circle') {
        editor.addShape({ ...base, radius: 30 * scale * size, type: 'circle' });
    } else {
        editor.addShape({
            ...base,
            height: (activeShape === 'rectangle' ? 30 : 100) * scaleY * size,
            type: activeShape,
            width: 100 * scaleX * size
        });
    }
}

function updateBlur(): void {
    if (!editor.hasImage()) {
        return;
    }

    editor.setAdjustment(
        'blur',
        numberValue(controls.blurRadius) * (numberValue(controls.blurStrength) / 100)
    );
}

function setAdjustment<Name extends keyof Adjustments>(
    name: Name,
    value: () => Adjustments[Name]
): () => void {
    return () => {
        if (editor.hasImage()) {
            editor.setAdjustment(name, value());
        }
    };
}

function closeModal(): void {
    if (saveModal) {
        saveModal.style.display = 'none';
    }
}

function updateQualityVisibility(): void {
    if (qualityLabel && formatControl) {
        qualityLabel.style.display =
            formatControl.value === 'jpeg' || formatControl.value === 'webp' ? '' : 'none';
    }
}

listen(imageInput, 'change', () => {
    const file = imageInput?.files?.[0];

    if (!file || !file.type.startsWith('image/')) {
        return;
    }

    void editor.load(file).catch(error => {
        imageInput.value = '';
        imageInput.setCustomValidity(error instanceof Error ? error.message : 'Image load failed');
        imageInput.reportValidity();
    });
});
listen(element('rotate_left'), 'click', () => editor.hasImage() && editor.rotateLeft());
listen(element('rotate_right'), 'click', () => editor.hasImage() && editor.rotateRight());
listen(element('flip_horizontal'), 'click', () => editor.hasImage() && editor.flipHorizontal());
listen(element('flip_vertical'), 'click', () => editor.hasImage() && editor.flipVertical());
listen(undoButton, 'click', () => editor.hasImage() && editor.undo());
listen(redoButton, 'click', () => editor.hasImage() && editor.redo());
listen(
    controls.exposure,
    'input',
    setAdjustment('brightness', () => Math.max(0, 1 + numberValue(controls.exposure) / 100))
);
listen(
    controls.contrast,
    'input',
    setAdjustment('contrast', () => Math.max(0, 1 + numberValue(controls.contrast) / 100))
);
listen(controls.blurRadius, 'input', updateBlur);
listen(controls.blurStrength, 'input', updateBlur);
listen(
    controls.sharpen,
    'input',
    setAdjustment('sharpen', () => numberValue(controls.sharpen) / 100)
);
listen(
    controls.grayscale,
    'input',
    setAdjustment('grayscale', () => numberValue(controls.grayscale) / 100)
);
listen(
    controls.saturation,
    'input',
    setAdjustment('saturation', () => numberValue(controls.saturation, 100) / 100)
);
listen(
    controls.color,
    'input',
    setAdjustment('overlayColor', () => controls.color?.value || '#ffffff')
);
listen(
    controls.colorOpacity,
    'input',
    setAdjustment('overlayOpacity', () => numberValue(controls.colorOpacity) / 100)
);
listen(element('clear_all'), 'click', () => editor.hasImage() && editor.reset());
listen(element('new_image'), 'click', () => {
    editor.clear();

    if (imageInput) {
        imageInput.value = '';
    }
});
listen(element('exposure-slider-cta'), 'click', () => {
    element('contrast-slider')?.classList.add('hidden');
    element('exposure-slider')?.classList.toggle('hidden');
});
listen(element('contrast-slider-cta'), 'click', () => {
    element('exposure-slider')?.classList.add('hidden');
    element('contrast-slider')?.classList.toggle('hidden');
});
listen(element('open_save_dialogue'), 'click', () => {
    if (editor.hasImage() && saveModal) {
        saveModal.style.display = 'block';
    }
});
listen(element('modal_close_btn'), 'click', closeModal);
listen(element('modal_cancel_btn'), 'click', closeModal);
listen(element('modal_save_btn'), 'click', () => {
    if (!editor.hasImage()) {
        return;
    }

    const format = formatControl?.value;
    editor.download({
        format: format === 'jpeg' || format === 'webp' ? format : 'png',
        quality: numberValue(qualityControl, 1)
    });
    closeModal();
});
listen(formatControl, 'change', updateQualityVisibility);
listen(saveModal, 'click', event => {
    if (event.target === saveModal) {
        closeModal();
    }
});
shapeTools.forEach(tool => listen(tool, 'click', () => toggleShape(tool)));
listen(canvas, 'click', event => addShape(event as MouseEvent));
listen(removeShapeButton, 'click', () => {
    if (editor.hasImage()) {
        editor.removeLastShape();
    }
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeModal();
        deactivateShapes();
    }

    const editingControl =
        event.target instanceof HTMLElement &&
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    let handled = false;

    if (editor.hasImage() && command && key === 'z') {
        handled = event.shiftKey ? editor.redo() : editor.undo();
    } else if (editor.hasImage() && event.ctrlKey && key === 'y') {
        handled = editor.redo();
    } else if (
        editor.hasImage() &&
        !editingControl &&
        (event.key === 'Delete' || event.key === 'Backspace')
    ) {
        handled = editor.removeLastShape();
    }

    if (handled) {
        event.preventDefault();
    }
});
editor.on('change', ({ state }) => {
    updateAdjustmentControls(state);
    updateHistoryButtons();
});
editor.on('shapeschange', updateShapeButton);
editor.on('clear', () => {
    deactivateShapes();
    closeModal();

    for (const control of [shapeColor, shapeOpacity, shapeSize]) {
        if (control) {
            control.value = control.defaultValue;
        }
    }
});
window.addEventListener('beforeunload', () => editor.dispose());
updateHistoryButtons();
updateShapeButton();
updateQualityVisibility();
