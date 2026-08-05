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
