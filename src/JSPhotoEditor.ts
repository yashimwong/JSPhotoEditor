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
        width?: number;
    };
    const width = dimensions.naturalWidth ?? dimensions.videoWidth ?? dimensions.width;
    const height = dimensions.naturalHeight ?? dimensions.videoHeight ?? dimensions.height;

    if (
        typeof width !== 'number' ||
        typeof height !== 'number' ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {
        throw new InvalidImageError('The image source has no usable dimensions');
    }

    return { height, width };
}

function fileStem(name: string): string {
    const value = name.split(/[\\/]/).pop()?.replace(/\.[^./\\]+$/, '').trim();
    return value || 'image';
}

function fileNameFromUrl(url: string): string {
    try {
        return fileStem(decodeURIComponent(new URL(url, 'http://localhost').pathname));
    } catch {
        return 'image';
    }
}

export class JSPhotoEditor {
    readonly canvas: HTMLCanvasElement;
    readonly #createImage: () => HTMLImageElement;
    readonly #createObjectURL: (blob: Blob) => string;
    readonly #events = new EventEmitter<EditorEvents>();
    readonly #history: HistoryManager<EditorState>;
    readonly #renderer: CanvasRenderer;
    readonly #revokeObjectURL: (url: string) => void;
    readonly #ownedObjectUrls = new Set<string>();
    #disposed = false;
    #fileName = 'image';
    #image: CanvasImageSource | undefined;
    #loadVersion = 0;
    #shapeSequence = 0;
    #sourceHeight = 0;
    #sourceWidth = 0;
    #state = createDefaultState();

    constructor(options: JSPhotoEditorOptions | HTMLCanvasElement = {}) {
        const normalizedOptions = isCanvas(options) ? { canvas: options } : options;
        const canvas = normalizedOptions.canvas ?? globalThis.document?.createElement('canvas');

        if (!canvas) {
            throw new Error('A canvas is required outside a browser environment');
        }

        const windowReference = canvas.ownerDocument?.defaultView;
        const ImageConstructor = windowReference?.Image ?? globalThis.Image;
        const urlReference = windowReference?.URL ?? globalThis.URL;

        if (!normalizedOptions.createImage && !ImageConstructor) {
            throw new Error('An image factory is required in this environment');
        }

        this.canvas = canvas;
        this.#renderer = new CanvasRenderer(canvas);
        this.#history = new HistoryManager(normalizedOptions.historyLimit ?? 50, cloneState);
        this.#createImage =
            normalizedOptions.createImage ?? (() => new ImageConstructor() as HTMLImageElement);
        this.#createObjectURL =
            normalizedOptions.createObjectURL ??
            ((blob: Blob) => {
                if (!urlReference?.createObjectURL) {
                    throw new Error('Object URLs are not supported in this environment');
                }

                return urlReference.createObjectURL(blob);
            });
        this.#revokeObjectURL =
            normalizedOptions.revokeObjectURL ??
            ((url: string) => {
                urlReference?.revokeObjectURL(url);
            });
    }

    get canUndo(): boolean {
        return this.#history.canUndo;
    }

    get canRedo(): boolean {
        return this.#history.canRedo;
    }

    get fileName(): string {
        return this.#fileName;
    }

    get state(): EditorState {
        return cloneState(this.#state);
    }

    get shapeCount(): number {
        return this.#state.shapes.length;
    }

    on<Name extends EditorEventName>(
        name: Name,
        listener: EditorEventListener<Name>
    ): () => void {
        this.#assertActive();
        return this.#events.on(name, listener);
    }

    off<Name extends EditorEventName>(name: Name, listener: EditorEventListener<Name>): void {
        this.#events.off(name, listener);
    }

    async load(source: EditorImageSource, options: LoadOptions = {}): Promise<void> {
        this.#assertActive();
        const version = ++this.#loadVersion;
        let image: CanvasImageSource;
        let objectUrl: string | undefined;
        let nextFileName = options.fileName;

        if (typeof source === 'string') {
            image = await this.#loadImageElement(source, options.crossOrigin);
            nextFileName ??= fileNameFromUrl(source);
        } else if (isBlob(source)) {
            objectUrl = this.#createObjectURL(source);
            this.#ownedObjectUrls.add(objectUrl);
            nextFileName ??= 'name' in source && typeof source.name === 'string' ? source.name : 'image';

            try {
                image = await this.#loadImageElement(objectUrl);
            } catch (error) {
                this.#releaseObjectUrl(objectUrl);
                throw error;
            }
        } else {
            image = source;
        }

        if (version !== this.#loadVersion || this.#disposed) {
            if (objectUrl) {
                this.#releaseObjectUrl(objectUrl);
            }
            return;
        }

        const dimensions = sourceDimensions(image);
        this.#releaseObjectUrlsExcept(objectUrl);
        this.#image = image;
        this.#sourceWidth = dimensions.width;
        this.#sourceHeight = dimensions.height;
        this.#fileName = fileStem(nextFileName ?? 'image');
        this.#state = createDefaultState();
        this.#history.clear();
        this.render();
        this.#emitHistory();
        this.#events.emit('load', {
            fileName: this.#fileName,
            height: this.#sourceHeight,
            width: this.#sourceWidth
        });
        this.#emitChange();
    }

    hasImage(): boolean {
        return Boolean(this.#image);
    }

    setAdjustment<Name extends keyof Adjustments>(
        name: Name,
        value: Adjustments[Name]
    ): void {
        this.setAdjustments({ [name]: value });
    }

    setAdjustments(adjustments: Partial<Adjustments>): void {
        this.#requireImage();
        const next = { ...this.#state.adjustments, ...adjustments };
        next.brightness = Math.max(0, finite(next.brightness, 'brightness'));
        next.contrast = Math.max(0, finite(next.contrast, 'contrast'));
        next.blur = Math.max(0, finite(next.blur, 'blur'));
        next.sharpen = clamp(finite(next.sharpen, 'sharpen'), 0, 1);
        next.grayscale = clamp(finite(next.grayscale, 'grayscale'), 0, 1);
        next.saturation = Math.max(0, finite(next.saturation, 'saturation'));
        next.overlayOpacity = clamp(finite(next.overlayOpacity, 'overlayOpacity'), 0, 1);

        this.#mutate(() => {
            this.#state.adjustments = next;
        });
    }

    rotate(degrees: number): void {
        this.#requireImage();

        if (!Number.isInteger(degrees) || degrees % 90 !== 0) {
            throw new RangeError('Rotation must be a multiple of 90 degrees');
        }

        this.#mutate(() => {
            this.#state.rotation = ((this.#state.rotation + degrees + 3600) % 360) as Rotation;
        });
    }

    rotateLeft(): void {
        this.rotate(-90);
    }

    rotateRight(): void {
        this.rotate(90);
    }

    flip(axis: FlipAxis): void {
        this.#requireImage();
        this.#mutate(() => {
            if (axis === 'horizontal') {
                this.#state.flipHorizontal = !this.#state.flipHorizontal;
            } else {
                this.#state.flipVertical = !this.#state.flipVertical;
            }
        });
    }

    flipHorizontal(): void {
        this.flip('horizontal');
    }

    flipVertical(): void {
        this.flip('vertical');
    }

    addShape(input: ShapeInput): EditorShape {
        this.#requireImage();
        const shape = this.#normalizeShape(input);
        this.#mutate(() => {
            this.#state.shapes.push(shape);
        });
        this.#emitShapes();
        return cloneShape(shape);
    }

    updateShape(id: string, update: Partial<ShapeInput>): EditorShape | undefined {
        this.#requireImage();
        const index = this.#state.shapes.findIndex(shape => shape.id === id);

        if (index < 0) {
            return undefined;
        }

        const shape = this.#normalizeShape({
            ...this.#state.shapes[index],
            ...update,
            id
        } as ShapeInput);
        this.#mutate(() => {
            this.#state.shapes[index] = shape;
        });
        this.#emitShapes();
        return cloneShape(shape);
    }

    removeShape(id?: string): EditorShape | undefined {
        this.#requireImage();
        const index = id
            ? this.#state.shapes.findIndex(shape => shape.id === id)
            : this.#state.shapes.length - 1;

        if (index < 0) {
            return undefined;
        }

        let removed: EditorShape | undefined;
        this.#mutate(() => {
            [removed] = this.#state.shapes.splice(index, 1);
        });
        this.#emitShapes();
        return removed ? cloneShape(removed) : undefined;
    }

    removeLastShape(): boolean {
        return Boolean(this.removeShape());
    }

    clearShapes(): boolean {
        this.#requireImage();

        if (this.#state.shapes.length === 0) {
            return false;
        }

        this.#mutate(() => {
            this.#state.shapes = [];
        });
        this.#emitShapes();
        return true;
    }

    getShapes(): EditorShape[] {
        return this.#state.shapes.map(cloneShape);
    }

    getShapeCount(): number {
        return this.shapeCount;
    }

    toImagePoint(point: Point): Point {
        this.#requireImage();
        return this.#renderer.toImagePoint(
            point,
            this.#sourceWidth,
            this.#sourceHeight,
            this.#state
        );
    }

    reset(): void {
        this.#requireImage();
        this.#mutate(() => {
            this.#state = createDefaultState();
        });
        this.#emitShapes();
    }

    undo(): boolean {
        this.#requireImage();
        const previous = this.#history.undo(this.#state);

        if (!previous) {
            return false;
        }

        this.#state = previous;
        this.render();
        this.#emitHistory();
        this.#emitShapes();
        this.#emitChange();
        return true;
    }

    redo(): boolean {
        this.#requireImage();
        const next = this.#history.redo(this.#state);

        if (!next) {
            return false;
        }

        this.#state = next;
        this.render();
        this.#emitHistory();
        this.#emitShapes();
        this.#emitChange();
        return true;
    }

    render(): void {
        this.#assertActive();

        if (!this.#image) {
            return;
        }

        this.#renderer.render(
            this.#image,
            this.#sourceWidth,
            this.#sourceHeight,
            this.#state
        );
        this.#events.emit('render', {
            height: this.canvas.height,
            width: this.canvas.width
        });
    }

    toDataURL(options: Omit<ExportOptions, 'fileName'> = {}): string {
        this.#requireImage();
        const format = options.format ?? 'png';
        const quality = clamp(options.quality ?? 0.92, 0, 1);

        if (format === 'jpeg' || format === 'webp') {
            return this.canvas.toDataURL(mimeTypes[format], quality);
        }

        return this.canvas.toDataURL(mimeTypes[format]);
    }

    toBlob(options: Omit<ExportOptions, 'fileName'> = {}): Promise<Blob> {
        this.#requireImage();
        const format = options.format ?? 'png';
        const quality = clamp(options.quality ?? 0.92, 0, 1);

        return new Promise((resolve, reject) => {
            this.canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('The canvas could not be exported'));
