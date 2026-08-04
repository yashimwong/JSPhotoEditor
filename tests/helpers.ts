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
