let activeTool;

const circleBtn = document.getElementById('circle_tool').addEventListener('click', function() {
    toggleDrawingMode(this);
});

const rectangleBtn = document.getElementById('rectangle_tool').addEventListener('click', function() {
    toggleDrawingMode(this);
});

const triangleBtn = document.getElementById('triangle_tool').addEventListener('click', function() {
    toggleDrawingMode(this);
});

function toggleDrawingMode(newTool) {
    if (!image.src) return;
    let activatedTools = document.getElementsByClassName('activated');
    while (activatedTools.length > 0) {
        activatedTools[0].classList.remove('activated');
    }

    activeTool = newTool.getAttribute('value') == activeTool ? undefined : newTool.getAttribute('value');
    if (activeTool) {
        newTool.classList.add('activated');
    } else {
        newTool.classList.remove('activated');
    }
}

canvas.addEventListener('click', drawShapes);
function drawShapes(event) {
    if (!activeTool) return;
    let mouseCoordinate = getMousePosition(event);
    x = mouseCoordinate.X;
    y = mouseCoordinate.Y;

    switch(activeTool) {
        case 'circle':
            drawCircle(x, y);
            break;
        case 'rectangle':
            drawRectangle(x, y);
            break;
        case 'triangle':
            drawTriangle(x, y);
            break;
        default:
            drawPolygon(x,y);
            break;
    }
}

function getMousePosition(event) {
    let rect = document.getElementById('canvas').getBoundingClientRect();
    return {
        X: event.clientX - rect.left,
        Y: event.clientY - rect.top
    };
}

function drawCircle(centerX, centerY) {
    let radius = 30;
    canvasContext.beginPath();
    canvasContext.arc(centerX - radius, centerY - radius, radius, 0, Math.PI * 2);
    canvasContext.fill();
}

function drawRectangle(centerX, centerY) {
    let width = 100;
    let height = 30;
    canvasContext.fillRect(centerX - width/2, centerY - height/2, width, height);
}

function drawTriangle(centerX, centerY) {
    let height = 200 * Math.cos(Math.PI / 6);
    canvasContext.beginPath();
    canvasContext.moveTo(centerX, centerY);
    canvasContext.lineTo(centerX+200,centerY);
    canvasContext.lineTo(centerX+100,centerY - height);
    canvasContext.fill();
}
