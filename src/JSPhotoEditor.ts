import { EditorDisposedError, InvalidImageError, MissingImageError } from './errors.js';
import { EventEmitter } from './events/EventEmitter.js';
import { HistoryManager } from './history/HistoryManager.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { cloneShape, cloneState, createDefaultState } from './state.js';
import type {
    Adjustments,
    EditorEvents,
    EditorEventListener,
    EditorEventName,
    EditorImageSource,
    EditorShape,
    EditorState,
    ExportOptions,
    FlipAxis,
    ImageFormat,
    JSPhotoEditorOptions,
    LoadOptions,
    Point,
    Rotation,
    ShapeInput
} from './types.js';

const mimeTypes: Record<ImageFormat, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
};

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}

function finite(value: number, name: string): number {
    if (!Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number`);
    }

    return value;
}

function isBlob(value: EditorImageSource): value is Blob {
    return (
        typeof value === 'object' &&
        value !== null &&
        'size' in value &&
        'type' in value &&
        typeof value.arrayBuffer === 'function'
    );
}

function isCanvas(value: JSPhotoEditorOptions | HTMLCanvasElement): value is HTMLCanvasElement {
    return 'getContext' in value && typeof value.getContext === 'function';
}

function sourceDimensions(source: CanvasImageSource): { height: number; width: number } {
    const dimensions = source as CanvasImageSource & {
        height?: number;
        naturalHeight?: number;
        naturalWidth?: number;
        videoHeight?: number;
        videoWidth?: number;
