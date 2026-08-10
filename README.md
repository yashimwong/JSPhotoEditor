# JSPhotoEditor

JSPhotoEditor is a framework-independent, browser canvas photo-editing library written in TypeScript. The editor owns image state, rendering, adjustments, transforms, shapes, history, export, and resource cleanup. Client applications own their markup and controls.

## Installation

```sh
npm install js-photo-editor
```

## Quick start

```ts
import JSPhotoEditor from 'js-photo-editor';

const editor = new JSPhotoEditor({
    canvas: document.querySelector('#canvas')
});

await editor.load(file);
editor.setAdjustments({
    brightness: 1.2,
    contrast: 1.1,
    saturation: 1.25
});
editor.rotateRight();
editor.download({ format: 'webp', quality: 0.85 });
```

In a browser, `new JSPhotoEditor()` creates a canvas automatically. Pass a canvas when the application needs to control where it is mounted.

## Editing API

Adjustments are non-destructive and can be updated individually or together.

```ts
editor.setAdjustment('grayscale', 0.5);
editor.setAdjustments({
    blur: 2,
    overlayColor: '#2563eb',
    overlayOpacity: 0.2,
    sharpen: 0.35
});
```

Brightness, contrast, and saturation use multipliers where `1` is unchanged. Grayscale, sharpen, and overlay opacity use values from `0` to `1`. Blur is measured in pixels.

Transforms, state, and history are available directly on the editor.

```ts
editor.rotateLeft();
editor.flipHorizontal();
editor.undo();
editor.redo();

console.log(editor.state);
console.log(editor.canUndo, editor.canRedo);
```

## Shapes

Shape coordinates are stored in original image space, so shapes remain aligned through rotations and flips.

```ts
const shape = editor.addShape({
    type: 'circle',
    x: 120,
    y: 80,
    radius: 30,
    color: '#ef4444',
    opacity: 0.75
});

editor.updateShape(shape.id, { radius: 45 });
editor.removeShape(shape.id);
```

Use `toImagePoint()` to translate a pointer location from the displayed canvas into original image coordinates.

## Loading and export

`load()` accepts a URL, `Blob`, `File`, or browser `CanvasImageSource`. Blob object URLs are created and released by the editor.

```ts
await editor.load(file);

const dataUrl = editor.toDataURL({ format: 'png' });
const blob = await editor.toBlob({ format: 'jpeg', quality: 0.9 });
const downloadedName = editor.download({ format: 'webp', quality: 0.8 });
```

PNG, JPEG, and WebP are supported. Call `clear()` to unload the current image or `dispose()` when the editor will no longer be used.

## Events

Typed events let a client keep its interface synchronized without coupling the library to a specific page.

```ts
const unsubscribe = editor.on('change', ({ state, canUndo, canRedo }) => {
    updateControls(state, canUndo, canRedo);
});

editor.on('shapeschange', shapes => {
    updateShapeList(shapes);
});

unsubscribe();
```

Available events are `load`, `render`, `change`, `historychange`, `shapeschange`, and `clear`.

## Development

Node.js 20.19 or newer is required.

```sh
npm install
npm run dev
npm run check
```

`npm run dev` starts the example client. `npm run build` emits ESM JavaScript and TypeScript declarations to `dist`.

## License

MIT
