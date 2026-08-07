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
        });

        await harness.editor.load(new File(['one'], 'one.png', { type: 'image/png' }));
        await harness.editor.load(new File(['two'], 'two.png', { type: 'image/png' }));

        expect(created).toEqual(['blob:image-1', 'blob:image-2']);
        expect(revoked).toEqual(['blob:image-1']);
        expect(harness.editor.fileName).toBe('two');
    });

    it('releases an object URL after image failure', async () => {
        const revoked = vi.fn();
        const harness = createHarness({
            createImage: () => {
                const image: {
                    onerror: ((event: Event) => void) | null;
                    onload: ((event: Event) => void) | null;
                    src: string;
                } = {
                    onerror: null,
                    onload: null,
                    set src(value: string) {
                        queueMicrotask(() => this.onerror?.(new Event('error')));
                    }
                };
                return image as unknown as HTMLImageElement;
            },
            createObjectURL: () => 'blob:failed',
            revokeObjectURL: revoked
        });

        await expect(
            harness.editor.load(new Blob(['bad'], { type: 'image/png' }))
        ).rejects.toBeInstanceOf(InvalidImageError);
        expect(revoked).toHaveBeenCalledWith('blob:failed');
    });

    it('rejects sources without dimensions', async () => {
        const harness = createHarness();
        await expect(
            harness.editor.load({ height: 0, width: 0 } as CanvasImageSource)
        ).rejects.toBeInstanceOf(InvalidImageError);
    });
});

describe('adjustments', () => {
    it('renders brightness and contrast filters', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.setAdjustments({ brightness: 1.5, contrast: 0.8 });

        expect(harness.context.drawFilters.at(-1)).toContain('brightness(1.5)');
        expect(harness.context.drawFilters.at(-1)).toContain('contrast(0.8)');
    });

    it('renders blur, grayscale, and saturation filters', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.setAdjustments({ blur: 4, grayscale: 0.65, saturation: 1.75 });

        expect(harness.context.drawFilters.at(-1)).toContain('blur(4px)');
        expect(harness.context.drawFilters.at(-1)).toContain('grayscale(0.65)');
        expect(harness.context.drawFilters.at(-1)).toContain('saturate(1.75)');
    });

    it('applies a color overlay', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.setAdjustments({ overlayColor: '#ef4444', overlayOpacity: 0.45 });

        expect(harness.context.fillStyle).toBe('#ef4444');
        expect(harness.context.fillRect).toHaveBeenCalledWith(0, 0, 4, 3);
    });

    it('applies sharpening to pixel data', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.setAdjustment('sharpen', 0.4);

        expect(harness.context.getImageData).toHaveBeenCalledWith(0, 0, 4, 3);
        expect(harness.context.putImageData).toHaveBeenCalled();
    });

    it('clamps bounded adjustments', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.setAdjustments({ grayscale: 2, overlayOpacity: -1, sharpen: 4 });

        expect(harness.editor.state.adjustments).toMatchObject({
            grayscale: 1,
            overlayOpacity: 0,
            sharpen: 1
        });
    });

    it('rejects non-finite adjustments', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        expect(() => harness.editor.setAdjustment('blur', Number.NaN)).toThrow(TypeError);
    });
});

describe('transforms', () => {
    it('rotates right and swaps canvas dimensions', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.rotateRight();

        expect(harness.canvas.width).toBe(3);
        expect(harness.canvas.height).toBe(4);
        expect(harness.context.translate).toHaveBeenCalledWith(3, 0);
        expect(harness.context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    });

    it('rotates left', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.rotateLeft();

        expect(harness.editor.state.rotation).toBe(270);
        expect(harness.context.rotate).toHaveBeenCalledWith(-Math.PI / 2);
    });

    it('rejects arbitrary rotation angles', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        expect(() => harness.editor.rotate(45)).toThrow(RangeError);
    });

    it('flips horizontally and vertically', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.flipHorizontal();
        harness.editor.flipVertical();

        expect(harness.editor.state.flipHorizontal).toBe(true);
        expect(harness.editor.state.flipVertical).toBe(true);
        expect(harness.context.scale).toHaveBeenCalledWith(-1, 1);
        expect(harness.context.scale).toHaveBeenCalledWith(1, -1);
    });

    it('maps displayed points into source coordinates', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.rotateRight();

        expect(harness.editor.toImagePoint({ x: 1, y: 2 })).toEqual({ x: 2, y: 2 });
    });
});

describe('shapes', () => {
    it('draws circles', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        const shape = harness.editor.addShape({
            color: '#111827',
            opacity: 0.8,
            radius: 30,
            type: 'circle',
            x: 2,
            y: 1
        });

        expect(shape.id).toBe('shape-1');
        expect(harness.context.arc).toHaveBeenCalledWith(2, 1, 30, 0, Math.PI * 2);
    });

    it('draws rectangles', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.addShape({
            color: '#111827',
            height: 2,
            opacity: 1,
            type: 'rectangle',
            width: 4,
            x: 2,
            y: 1
        });

        expect(harness.context.fillRect).toHaveBeenCalledWith(0, 0, 4, 2);
    });

    it('draws triangles', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.addShape({
            color: '#111827',
            height: 2,
            opacity: 1,
            type: 'triangle',
            width: 4,
            x: 2,
            y: 1
        });

        expect(harness.context.moveTo).toHaveBeenCalledWith(2, 0);
        expect(harness.context.lineTo).toHaveBeenCalledTimes(2);
    });

    it('updates shapes by id', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        const shape = harness.editor.addShape({
            color: '#111827',
            opacity: 1,
            radius: 1,
            type: 'circle',
            x: 1,
            y: 1
        });

        const updated = harness.editor.updateShape(shape.id, { radius: 2 });

        expect(updated).toMatchObject({ id: shape.id, radius: 2 });
        expect(harness.editor.updateShape('missing', { radius: 3 })).toBeUndefined();
    });

    it('removes a selected shape', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        const first = harness.editor.addShape({
            color: '#111827',
            opacity: 1,
            radius: 1,
            type: 'circle',
            x: 1,
            y: 1
        });
        harness.editor.addShape({
            color: '#111827',
            opacity: 1,
            radius: 1,
            type: 'circle',
            x: 2,
            y: 2
        });

        expect(harness.editor.removeShape(first.id)?.id).toBe(first.id);
        expect(harness.editor.shapeCount).toBe(1);
    });

    it('clears every shape as one operation', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.addShape({
            color: '#111827',
            opacity: 1,
            radius: 1,
            type: 'circle',
            x: 1,
            y: 1
        });

        expect(harness.editor.clearShapes()).toBe(true);
        expect(harness.editor.clearShapes()).toBe(false);
        expect(harness.editor.shapeCount).toBe(0);
    });

    it('returns defensive shape copies', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.addShape({
            color: '#111827',
            opacity: 1,
            radius: 1,
            type: 'circle',
            x: 1,
            y: 1
        });
        const shapes = harness.editor.getShapes();
        shapes.length = 0;
        expect(harness.editor.shapeCount).toBe(1);
    });
});

describe('history', () => {
    it('undoes and redoes adjustments', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.setAdjustment('brightness', 1.4);

        expect(harness.editor.undo()).toBe(true);
        expect(harness.editor.state.adjustments.brightness).toBe(1);
        expect(harness.editor.redo()).toBe(true);
        expect(harness.editor.state.adjustments.brightness).toBe(1.4);
    });

    it('restores shapes through history', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.addShape({
            color: '#111827',
            opacity: 1,
            radius: 1,
            type: 'circle',
            x: 1,
            y: 1
        });
        harness.editor.removeLastShape();

        harness.editor.undo();

        expect(harness.editor.shapeCount).toBe(1);
    });

    it('clears redo history after a new change', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.setAdjustment('brightness', 1.4);
        harness.editor.undo();
        harness.editor.setAdjustment('contrast', 1.2);
        expect(harness.editor.canRedo).toBe(false);
    });

    it('honors the configured history limit', async () => {
        const harness = createHarness({ historyLimit: 2 });
        await loadHarness(harness);
        harness.editor.setAdjustment('brightness', 1.1);
        harness.editor.setAdjustment('brightness', 1.2);
        harness.editor.setAdjustment('brightness', 1.3);

        expect(harness.editor.undo()).toBe(true);
        expect(harness.editor.undo()).toBe(true);
        expect(harness.editor.undo()).toBe(false);
        expect(harness.editor.state.adjustments.brightness).toBe(1.1);
    });
});

describe('export', () => {
    it('exports lossless PNG data', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        expect(harness.editor.toDataURL()).toBe('data:image/mock;base64,image');
        expect(harness.toDataURL).toHaveBeenCalledWith('image/png');
    });

    it('exports lossy data with fractional quality', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        harness.editor.toDataURL({ format: 'jpeg', quality: 0.7 });

        expect(harness.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.7);
    });

    it('exports blobs', async () => {
        const harness = createHarness();
        await loadHarness(harness);

        const blob = await harness.editor.toBlob({ format: 'webp', quality: 0.8 });

        expect(blob.type).toBe('image/webp');
        expect(harness.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.8);
    });

    it('downloads with a derived filename', async () => {
        const harness = createHarness();
        await loadHarness(harness, 'holiday.jpeg');
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        expect(harness.editor.download({ format: 'webp' })).toBe('holiday_jsphotoeditor.webp');
        expect(click).toHaveBeenCalled();
    });
});

describe('lifecycle', () => {
    it('resets edits without unloading the image', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.setAdjustment('brightness', 1.4);

        harness.editor.reset();

        expect(harness.editor.hasImage()).toBe(true);
        expect(harness.editor.state.adjustments.brightness).toBe(1);
        expect(harness.editor.canUndo).toBe(true);
    });

    it('clears image state and canvas dimensions', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        const cleared = vi.fn();
        harness.editor.on('clear', cleared);

        harness.editor.clear();

        expect(harness.editor.hasImage()).toBe(false);
        expect(harness.canvas.width).toBe(0);
        expect(harness.canvas.height).toBe(0);
        expect(cleared).toHaveBeenCalledOnce();
    });

    it('unsubscribes event listeners', async () => {
        const harness = createHarness();
        const listener = vi.fn();
        const unsubscribe = harness.editor.on('change', listener);
        unsubscribe();
        await loadHarness(harness);
        expect(listener).not.toHaveBeenCalled();
    });

    it('rejects editing operations without an image', () => {
        const harness = createHarness();
        expect(() => harness.editor.rotateRight()).toThrow(MissingImageError);
        expect(() => harness.editor.toDataURL()).toThrow(MissingImageError);
    });

    it('prevents use after disposal', async () => {
        const harness = createHarness();
        await loadHarness(harness);
        harness.editor.dispose();
        expect(() => harness.editor.render()).toThrow(EditorDisposedError);
        expect(() => harness.editor.on('change', vi.fn())).toThrow(EditorDisposedError);
    });
});
