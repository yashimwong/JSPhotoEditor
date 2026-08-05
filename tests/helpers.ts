import { vi } from 'vitest';
import { JSPhotoEditor } from '../src/index.js';
import type { JSPhotoEditorOptions } from '../src/index.js';

export interface ContextMock {
    arc: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    clearRect: ReturnType<typeof vi.fn>;
    closePath: ReturnType<typeof vi.fn>;
    drawFilters: string[];
    drawImage: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    fillStyle: string | CanvasGradient | CanvasPattern;
    filter: string;
    getImageData: ReturnType<typeof vi.fn>;
    globalAlpha: number;
    globalCompositeOperation: GlobalCompositeOperation;
    lineTo: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    putImageData: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    rotate: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    scale: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
}

export interface EditorHarness {
    canvas: HTMLCanvasElement;
    context: ContextMock;
    editor: JSPhotoEditor;
    source: CanvasImageSource;
    toBlob: ReturnType<typeof vi.fn>;
    toDataURL: ReturnType<typeof vi.fn>;
}

export function createContext(): ContextMock {
    const pixels = new Uint8ClampedArray(4 * 3 * 4);
    pixels.fill(100);
    const drawFilters: string[] = [];
    const context: ContextMock = {
        arc: vi.fn(),
        beginPath: vi.fn(),
        clearRect: vi.fn(),
        closePath: vi.fn(),
        drawFilters,
        drawImage: vi.fn(() => drawFilters.push(context.filter)),
