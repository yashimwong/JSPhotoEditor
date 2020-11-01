let points = {};
let activeTool;
let activeToolControls = {};

const circleTool = document.getElementById('circle_tool');
const rectangleTool = document.getElementById('rectangle_tool');
const triangleTool = document.getElementById('triangle_tool');

const circleBtn = circleTool.addEventListener('click', function() {
    toggleDrawingMode(this);
});

const rectangleBtn = rectangleTool.addEventListener('click', function() {
    toggleDrawingMode(this);
});

const triangleBtn = triangleTool.addEventListener('click', function() {
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

    switch(activeTool) {
        case 'circle':
            drawCircle(mouseCoordinate);
            break;
        case 'rectangle':
            drawRectangle(mouseCoordinate);
            break;
        case 'triangle':
            drawTriangle(mouseCoordinate);
            break;
        default:
            drawPolygon(mouseCoordinate);
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

function drawCircle({X, Y}) {
    let radius = 30;
    canvasContext.beginPath();
    canvasContext.arc(X, Y, radius, 0, Math.PI * 2);
    canvasContext.fill();
}

function drawRectangle({X, Y}) {
    let width = 100;
    let height = 30;
    canvasContext.fillRect(X - width/2, Y - height/2, width, height);
}

function drawTriangle({X, Y}) {
    let width = 100;
    let height = 100;
    canvasContext.beginPath();
    canvasContext.moveTo(x, y);
    canvasContext.lineTo(x - width, y);
    canvasContext.lineTo(x - width/2, y - height);
    canvasContext.lineTo(x, y);
    canvasContext.fill();
}
