export class JSPhotoEditorError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'JSPhotoEditorError';
    }
}

export class InvalidImageError extends JSPhotoEditorError {
    constructor(message = 'The image source could not be loaded') {
        super(message);
        this.name = 'InvalidImageError';
    }
}

export class EditorDisposedError extends JSPhotoEditorError {
    constructor() {
        super('The editor has been disposed');
        this.name = 'EditorDisposedError';
    }
}

export class MissingImageError extends JSPhotoEditorError {
    constructor() {
        super('Load an image before using this operation');
        this.name = 'MissingImageError';
    }
}
