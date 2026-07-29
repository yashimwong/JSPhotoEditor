export type Rotation = 0 | 90 | 180 | 270;

export type FlipAxis = 'horizontal' | 'vertical';

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export type ShapeType = 'circle' | 'rectangle' | 'triangle';

export interface Point {
    x: number;
    y: number;
}

export interface Adjustments {
    brightness: number;
    contrast: number;
    blur: number;
    sharpen: number;
    grayscale: number;
    saturation: number;
    overlayColor: string;
    overlayOpacity: number;
}

export interface ShapeBase {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    color: string;
    opacity: number;
}

export interface CircleShape extends ShapeBase {
    type: 'circle';
    radius: number;
}

export interface RectangleShape extends ShapeBase {
    type: 'rectangle';
    width: number;
    height: number;
}

export interface TriangleShape extends ShapeBase {
    type: 'triangle';
    width: number;
    height: number;
}

export type EditorShape = CircleShape | RectangleShape | TriangleShape;

export type ShapeInput =
    | Omit<CircleShape, 'id'> & { id?: string }
    | Omit<RectangleShape, 'id'> & { id?: string }
    | Omit<TriangleShape, 'id'> & { id?: string };

export interface EditorState {
    adjustments: Adjustments;
    rotation: Rotation;
    flipHorizontal: boolean;
    flipVertical: boolean;
    shapes: EditorShape[];
}

export interface LoadOptions {
    crossOrigin?: string;
    fileName?: string;
}

export interface ExportOptions {
    fileName?: string;
    format?: ImageFormat;
    quality?: number;
}

export type EditorImageSource = Blob | string | CanvasImageSource;

export interface JSPhotoEditorOptions {
    canvas?: HTMLCanvasElement;
    createImage?: () => HTMLImageElement;
    createObjectURL?: (blob: Blob) => string;
    historyLimit?: number;
    revokeObjectURL?: (url: string) => void;
}

export interface EditorChangeEvent {
    canRedo: boolean;
    canUndo: boolean;
    state: EditorState;
}

export interface EditorHistoryEvent {
    canRedo: boolean;
    canUndo: boolean;
}

export interface EditorLoadEvent {
    fileName: string;
    height: number;
    width: number;
}

export interface EditorRenderEvent {
    height: number;
    width: number;
}

export interface EditorEvents {
    change: EditorChangeEvent;
    clear: undefined;
    historychange: EditorHistoryEvent;
    load: EditorLoadEvent;
    render: EditorRenderEvent;
    shapeschange: EditorShape[];
}

export type EditorEventName = keyof EditorEvents;

export type EditorEventListener<Name extends EditorEventName> = (
    event: EditorEvents[Name]
) => void;
