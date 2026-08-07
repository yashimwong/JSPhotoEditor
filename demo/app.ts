import { JSPhotoEditor } from '../src/index.js';
import type { Adjustments, EditorState, ShapeType } from '../src/index.js';

declare global {
    interface Window {
        photoEditor: JSPhotoEditor;
    }
}

const canvasElement = document.querySelector<HTMLCanvasElement>('#canvas');

if (!canvasElement) {
    throw new Error('The demo requires a canvas');
}

const canvas: HTMLCanvasElement = canvasElement;
const editor = new JSPhotoEditor({ canvas });
window.photoEditor = editor;

const element = <ElementType extends HTMLElement>(id: string): ElementType | null =>
    document.querySelector<ElementType>(`#${id}`);
const listen = <EventName extends keyof HTMLElementEventMap>(
    target: HTMLElement | null,
    eventName: EventName,
    listener: (event: HTMLElementEventMap[EventName]) => void
): void => {
    target?.addEventListener(eventName, listener as EventListener);
};
const numberValue = (control: HTMLInputElement | null, fallback = 0): number => {
