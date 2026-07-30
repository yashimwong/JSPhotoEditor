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

