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
