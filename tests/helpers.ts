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
        fill: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '#000000',
        filter: 'none',
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(pixels) })),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineTo: vi.fn(),
        moveTo: vi.fn(),
        putImageData: vi.fn(),
        restore: vi.fn(),
        rotate: vi.fn(),
        save: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn()
    };
    return context;
}

export function createHarness(options: Omit<JSPhotoEditorOptions, 'canvas'> = {}): EditorHarness {
    const canvas = document.createElement('canvas');
    const context = createContext();
    const toDataURL = vi.fn(() => 'data:image/mock;base64,image');
    const toBlob = vi.fn((callback: BlobCallback, type?: string) => {
        callback(new Blob(['image'], type ? { type } : undefined));
    });

    Object.defineProperties(canvas, {
        getContext: { configurable: true, value: vi.fn(() => context) },
        toBlob: { configurable: true, value: toBlob },
        toDataURL: { configurable: true, value: toDataURL }
    });
    document.body.appendChild(canvas);

    return {
        canvas,
        context,
        editor: new JSPhotoEditor({ ...options, canvas }),
        source: { height: 3, width: 4 } as CanvasImageSource,
        toBlob,
        toDataURL
    };
}

export async function loadHarness(harness: EditorHarness, fileName = 'holiday.jpeg'): Promise<void> {
    await harness.editor.load(harness.source, { fileName });
}
