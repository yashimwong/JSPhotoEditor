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
