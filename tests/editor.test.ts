import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    EditorDisposedError,
    InvalidImageError,
    JSPhotoEditor,
    MissingImageError
} from '../src/index.js';
import { createContext, createHarness, loadHarness } from './helpers.js';

afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
});

describe('construction', () => {
    it('creates its own canvas in a browser', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            createContext() as unknown as CanvasRenderingContext2D
        );
        expect(() => new JSPhotoEditor()).not.toThrow();
    });

    it('accepts a canvas directly', () => {
        const { canvas, editor } = createHarness();
        expect(new JSPhotoEditor(canvas).canvas).toBe(canvas);
        expect(editor.canvas).toBe(canvas);
    });

    it('rejects an invalid history limit', () => {
        expect(() => createHarness({ historyLimit: 0 })).toThrow(RangeError);
    });
});

describe('image loading', () => {
    it('loads a canvas source and renders it', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        expect(harness.editor.hasImage()).toBe(true);
        expect(harness.canvas.width).toBe(4);
        expect(harness.canvas.height).toBe(3);
        expect(harness.editor.fileName).toBe('holiday');
        expect(harness.context.drawImage).toHaveBeenCalledWith(harness.source, 0, 0, 4, 3);
    });

    it('emits load and render details', async () => {
        const harness = createHarness();
        const loaded = vi.fn();
        const rendered = vi.fn();
        harness.editor.on('load', loaded);
        harness.editor.on('render', rendered);

        await loadHarness(harness, 'portrait.webp');

        expect(loaded).toHaveBeenCalledWith({ fileName: 'portrait', height: 3, width: 4 });
        expect(rendered).toHaveBeenCalledWith({ height: 3, width: 4 });
    });

    it('loads blobs and retains only the active object URL', async () => {
        const created: string[] = [];
        const revoked: string[] = [];
        const harness = createHarness({
            createImage: () => {
                const image: {
                    naturalHeight: number;
                    naturalWidth: number;
                    onerror: ((event: Event) => void) | null;
                    onload: ((event: Event) => void) | null;
                    src: string;
                } = {
                    naturalHeight: 3,
                    naturalWidth: 4,
                    onerror: null,
                    onload: null,
                    set src(value: string) {
                        queueMicrotask(() => this.onload?.(new Event('load')));
                    }
                };
                return image as unknown as HTMLImageElement;
            },
            createObjectURL: () => {
                const url = `blob:image-${created.length + 1}`;
                created.push(url);
                return url;
            },
            revokeObjectURL: url => revoked.push(url)
