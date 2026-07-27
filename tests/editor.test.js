import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const projectRoot = process.cwd();
const mainSource = readFileSync(resolve(projectRoot, 'js/main.js'), 'utf8');
const drawSource = readFileSync(resolve(projectRoot, 'js/draw.js'), 'utf8');
const openApplications = [];

function createContext() {
    const pixels = new Uint8ClampedArray(4 * 3 * 4);
    const drawFilters = [];
    pixels.fill(100);

    const context = {
        arc: vi.fn(),
        beginPath: vi.fn(),
        clearRect: vi.fn(),
        closePath: vi.fn(),
        drawFilters,
        drawImage: vi.fn(() => drawFilters.push(context.filter)),
        fill: vi.fn(),
        fillRect: vi.fn(),
        filter: 'none',
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(pixels) })),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineTo: vi.fn(),
        moveTo: vi.fn(),
        putImageData: vi.fn(),
        restore: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        save: vi.fn()
    };

    return context;
}

function createApplication(page = 'index.html', includeDrawing = page === 'index.html') {
    const html = readFileSync(resolve(projectRoot, page), 'utf8');
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        url: 'https://photo-editor.test/'
    });
    const { window } = dom;
    const context = createContext();

    window.HTMLCanvasElement.prototype.getContext = vi.fn(() => context);
    window.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/mock;base64,image');
    window.HTMLAnchorElement.prototype.click = vi.fn();
    window.URL.createObjectURL = vi.fn(() => 'blob:photo');
    window.URL.revokeObjectURL = vi.fn();
    window.Image = class {
        constructor() {
            this.naturalHeight = 3;
            this.naturalWidth = 4;
        }

        set src(value) {
            this.currentSource = value;
            window.queueMicrotask(() => this.onload());
        }

        get src() {
            return this.currentSource;
        }
    };

    window.eval(mainSource);

    if (includeDrawing) {
        window.eval(drawSource);
    }

    const application = { context, dom, window };
    openApplications.push(application);
    return application;
}

async function loadPhoto(window) {
    const input = window.document.getElementById('load_image');
    const file = new window.File(['photo'], 'holiday.photo.jpeg', { type: 'image/jpeg' });

    Object.defineProperty(input, 'files', {
        configurable: true,
        value: [file]
    });
    input.dispatchEvent(new window.Event('change'));
    await Promise.resolve();
}

afterEach(() => {
    while (openApplications.length > 0) {
        openApplications.pop().dom.window.close();
    }
});

describe('editor startup', () => {
    it.each(['index.html', 'index_ui.html'])('starts on %s without missing-control errors', async page => {
        const { window } = createApplication(page);

        await loadPhoto(window);

        expect(window.photoEditor).toBeDefined();
        expect(window.photoEditor.hasImage()).toBe(true);
    });
});

describe('image editing', () => {
    it('loads an image and renders non-destructive adjustments', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        const canvas = window.document.getElementById('canvas');
        expect(canvas.width).toBe(4);
        expect(canvas.height).toBe(3);
        expect(context.drawImage).toHaveBeenCalled();

        const exposure = window.document.getElementById('exposure');
        exposure.value = '50';
        exposure.dispatchEvent(new window.Event('input'));

        expect(context.drawFilters.at(-1)).toContain('brightness(1.5)');

        const colorOpacity = window.document.getElementById('color_opacity');
        colorOpacity.value = '50';
        colorOpacity.dispatchEvent(new window.Event('input'));

        expect(context.fillRect).toHaveBeenCalledWith(0, 0, 4, 3);

        const sharpen = window.document.getElementById('sharpen_strength');
        sharpen.value = '40';
        sharpen.dispatchEvent(new window.Event('input'));

        expect(context.getImageData).toHaveBeenCalledWith(0, 0, 4, 3);
        expect(context.putImageData).toHaveBeenCalled();
    });

    it('applies an adjustable grayscale filter', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        const grayscale = window.document.getElementById('grayscale');
        grayscale.value = '65';
        grayscale.dispatchEvent(new window.Event('input'));

        expect(context.drawFilters.at(-1)).toContain('grayscale(0.65)');
    });

    it('increases or decreases color saturation', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        const saturation = window.document.getElementById('saturation');
        saturation.value = '175';
        saturation.dispatchEvent(new window.Event('input'));

        expect(context.drawFilters.at(-1)).toContain('saturate(1.75)');
    });

    it('rotates the canvas and maps new shapes into image coordinates', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);
        window.document.getElementById('rotate_right').click();

        const canvas = window.document.getElementById('canvas');
        expect(canvas.width).toBe(3);
        expect(canvas.height).toBe(4);
        expect(context.translate).toHaveBeenCalledWith(3, 0);
        expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);

        canvas.getBoundingClientRect = vi.fn(() => ({
            bottom: 4,
            height: 4,
            left: 0,
            right: 3,
            top: 0,
            width: 3,
            x: 0,
            y: 0
        }));
        window.document.getElementById('circle_tool').click();
        canvas.dispatchEvent(new window.MouseEvent('click', { clientX: 1, clientY: 2 }));

        expect(context.arc).toHaveBeenCalledWith(2, 2, 30, 0, Math.PI * 2);
    });

    it('flips the image and maps drawing coordinates through the transform', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);
        window.document.getElementById('flip_horizontal').click();

        expect(context.translate).toHaveBeenCalledWith(4, 0);
        expect(context.scale).toHaveBeenCalledWith(-1, 1);

        const canvas = window.document.getElementById('canvas');
        canvas.getBoundingClientRect = vi.fn(() => ({
            bottom: 3,
            height: 3,
            left: 0,
            right: 4,
            top: 0,
            width: 4,
            x: 0,
            y: 0
        }));
        window.document.getElementById('circle_tool').click();
        canvas.dispatchEvent(new window.MouseEvent('click', { clientX: 1, clientY: 2 }));

        expect(context.arc).toHaveBeenCalledWith(3, 2, 30, 0, Math.PI * 2);
    });

    it('undoes and redoes editing operations', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        const exposure = window.document.getElementById('exposure');
        const undo = window.document.getElementById('undo');
        const redo = window.document.getElementById('redo');
        exposure.value = '40';
        exposure.dispatchEvent(new window.Event('input'));

        expect(context.drawFilters.at(-1)).toContain('brightness(1.4)');
        expect(undo.disabled).toBe(false);

        undo.click();
        expect(exposure.value).toBe('0');
        expect(context.drawFilters.at(-1)).toContain('brightness(1)');
        expect(redo.disabled).toBe(false);

        redo.click();
        expect(exposure.value).toBe('40');
        expect(context.drawFilters.at(-1)).toContain('brightness(1.4)');
    });

    it('draws shapes with the selected color and opacity', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        const color = window.document.getElementById('shape_color');
        const opacity = window.document.getElementById('shape_opacity');
        color.value = '#ef4444';
        opacity.value = '45';
        window.document.getElementById('circle_tool').click();
        window.document
            .getElementById('canvas')
            .dispatchEvent(new window.MouseEvent('click', { clientX: 2, clientY: 1 }));

        expect(context.fillStyle).toBe('#ef4444');
        expect(context.globalAlpha).toBe(0.45);
    });

    it('scales newly drawn shapes to the selected size', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        window.document.getElementById('shape_size').value = '150';
        window.document.getElementById('circle_tool').click();
        window.document
            .getElementById('canvas')
            .dispatchEvent(new window.MouseEvent('click', { clientX: 2, clientY: 1 }));

        expect(context.arc).toHaveBeenCalledWith(2, 1, 45, 0, Math.PI * 2);
    });

    it('removes the latest shape and can restore it with undo', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        const canvas = window.document.getElementById('canvas');
        const removeShape = window.document.getElementById('remove_last_shape');
        window.document.getElementById('circle_tool').click();
        canvas.dispatchEvent(new window.MouseEvent('click', { clientX: 2, clientY: 1 }));
        expect(removeShape.disabled).toBe(false);

        context.arc.mockClear();
        removeShape.click();
        expect(context.arc).not.toHaveBeenCalled();
        expect(removeShape.disabled).toBe(true);

        window.document.getElementById('undo').click();
        expect(context.arc).toHaveBeenCalled();
        expect(removeShape.disabled).toBe(false);
    });

    it('draws a triangle at scaled canvas coordinates and clears it', async () => {
        const { context, window } = createApplication();

        await loadPhoto(window);

        const canvas = window.document.getElementById('canvas');
        canvas.getBoundingClientRect = vi.fn(() => ({
            bottom: 120,
            height: 100,
            left: 10,
            right: 210,
            top: 20,
            width: 200,
            x: 10,
            y: 20
        }));

        const triangle = window.document.getElementById('triangle_tool');
        triangle.click();
        canvas.dispatchEvent(
            new window.MouseEvent('click', {
                clientX: 110,
                clientY: 70
            })
        );

        expect(context.moveTo).toHaveBeenCalled();
        expect(context.lineTo).toHaveBeenCalledTimes(2);
        expect(triangle.classList.contains('activated')).toBe(true);

        window.document.getElementById('clear_all').click();

        expect(triangle.classList.contains('activated')).toBe(false);
        expect(window.document.getElementById('exposure').value).toBe('0');
    });

    it('uses fractional quality when saving lossy formats', async () => {
        const { window } = createApplication();

        await loadPhoto(window);

        const format = window.document.getElementById('image_format');
        const compression = window.document.getElementById('image_compression');
        format.value = 'jpeg';
        compression.value = '0.7';
        format.dispatchEvent(new window.Event('change'));
        window.document.getElementById('open_save_dialogue').click();
        window.document.getElementById('modal_save_btn').click();

        const canvas = window.document.getElementById('canvas');
        expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.7);
        expect(window.HTMLAnchorElement.prototype.click).toHaveBeenCalled();
        expect(window.document.getElementById('save_image_modal').style.display).toBe('none');
    });

    it('releases object URLs when starting a new image', async () => {
        const { window } = createApplication();

        await loadPhoto(window);
        window.document.getElementById('new_image').click();

        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
        expect(window.photoEditor.hasImage()).toBe(false);
        expect(window.document.getElementById('canvas').width).toBe(0);
    });
});
