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
