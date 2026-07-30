import type { EditorShape } from '../types.js';

export function renderShapes(
    context: CanvasRenderingContext2D,
    shapes: readonly EditorShape[]
): void {
    context.save();
    context.filter = 'none';
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';

    for (const shape of shapes) {
        context.fillStyle = shape.color;
        context.globalAlpha = shape.opacity;

        if (shape.type === 'circle') {
            context.beginPath();
            context.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
            context.fill();
        } else if (shape.type === 'rectangle') {
            context.fillRect(
                shape.x - shape.width / 2,
                shape.y - shape.height / 2,
                shape.width,
                shape.height
            );
        } else {
            context.beginPath();
            context.moveTo(shape.x, shape.y - shape.height / 2);
            context.lineTo(shape.x - shape.width / 2, shape.y + shape.height / 2);
            context.lineTo(shape.x + shape.width / 2, shape.y + shape.height / 2);
            context.closePath();
            context.fill();
        }
    }

    context.restore();
}
