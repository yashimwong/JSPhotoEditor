import { renderShapes } from './renderShapes.js';
import type { EditorState, Point } from '../types.js';

export class CanvasRenderer {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (!context) {
            throw new Error('A two-dimensional canvas context is required');
        }

        this.canvas = canvas;
        this.context = context;
    }

    resize(sourceWidth: number, sourceHeight: number, state: EditorState): void {
        const swapsDimensions = state.rotation === 90 || state.rotation === 270;
        const width = swapsDimensions ? sourceHeight : sourceWidth;
        const height = swapsDimensions ? sourceWidth : sourceHeight;

        if (this.canvas.width !== width) {
            this.canvas.width = width;
        }

        if (this.canvas.height !== height) {
            this.canvas.height = height;
        }
    }

    render(
        image: CanvasImageSource,
        sourceWidth: number,
        sourceHeight: number,
        state: EditorState
    ): void {
        this.resize(sourceWidth, sourceHeight, state);
        const { adjustments } = state;
        const context = this.context;

        context.save();
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.filter = [
            `brightness(${adjustments.brightness})`,
            `contrast(${adjustments.contrast})`,
            `blur(${adjustments.blur}px)`,
            `grayscale(${adjustments.grayscale})`,
            `saturate(${adjustments.saturation})`
        ].join(' ');
        this.applyTransform(state);
