import type { Adjustments, EditorShape, EditorState } from './types.js';

export function createDefaultAdjustments(): Adjustments {
    return {
        blur: 0,
        brightness: 1,
        contrast: 1,
        grayscale: 0,
        overlayColor: '#ffffff',
        overlayOpacity: 0,
        saturation: 1,
        sharpen: 0
    };
}

export function createDefaultState(): EditorState {
    return {
        adjustments: createDefaultAdjustments(),
        flipHorizontal: false,
        flipVertical: false,
        rotation: 0,
        shapes: []
    };
}

export function cloneShape(shape: EditorShape): EditorShape {
    return { ...shape };
}

export function cloneState(state: EditorState): EditorState {
    return {
        adjustments: { ...state.adjustments },
        flipHorizontal: state.flipHorizontal,
        flipVertical: state.flipVertical,
        rotation: state.rotation,
        shapes: state.shapes.map(cloneShape)
    };
}
