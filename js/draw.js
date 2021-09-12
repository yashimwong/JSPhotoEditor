(() => {
    'use strict';

    const editor = window.photoEditor;

    if (!editor) {
        return;
    }

    const tools = [
        document.getElementById('circle_tool'),
        document.getElementById('rectangle_tool'),
        document.getElementById('triangle_tool')
    ].filter(Boolean);
    let activeTool;

    function deactivateTools() {
        activeTool = undefined;
        tools.forEach(tool => tool.classList.remove('activated'));
    }

    function toggleDrawingMode(tool) {
        if (!editor.hasImage()) {
            return;
        }

        const nextTool = tool.dataset.shape || tool.getAttribute('value');
        const shouldDeactivate = nextTool === activeTool;
        deactivateTools();

        if (!shouldDeactivate) {
            activeTool = nextTool;
            tool.classList.add('activated');
        }
    }

    function getMousePosition(event) {
        const rectangle = editor.canvas.getBoundingClientRect();
        const scaleX = rectangle.width ? editor.canvas.width / rectangle.width : 1;
        const scaleY = rectangle.height ? editor.canvas.height / rectangle.height : 1;

        return {
            x: (event.clientX - rectangle.left) * scaleX,
            y: (event.clientY - rectangle.top) * scaleY,
            scaleX,
            scaleY
        };
    }

    function addShape(event) {
        if (!activeTool) {
            return;
        }

        const point = editor.toImagePoint(getMousePosition(event));
        const sizeScale = (point.scaleX + point.scaleY) / 2;

        editor.addShape({
            type: activeTool,
            x: point.x,
            y: point.y,
            radius: 30 * sizeScale,
            width: 100 * point.scaleX,
            height: (activeTool === 'rectangle' ? 30 : 100) * point.scaleY
        });
    }

    function renderShapes(context, shapes) {
        context.save();
        context.filter = 'none';
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = '#111827';

        shapes.forEach(shape => {
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
            } else if (shape.type === 'triangle') {
                context.beginPath();
                context.moveTo(shape.x, shape.y - shape.height / 2);
                context.lineTo(shape.x - shape.width / 2, shape.y + shape.height / 2);
                context.lineTo(shape.x + shape.width / 2, shape.y + shape.height / 2);
                context.closePath();
                context.fill();
            }
        });

        context.restore();
    }

    tools.forEach(tool => {
        tool.addEventListener('click', () => toggleDrawingMode(tool));
    });
    editor.canvas.addEventListener('click', addShape);
    window.addEventListener('photoeditor:clear', deactivateTools);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            deactivateTools();
        }
    });
    editor.setShapeRenderer(renderShapes);
})();
