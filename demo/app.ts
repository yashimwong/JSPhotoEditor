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
