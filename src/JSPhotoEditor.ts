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
