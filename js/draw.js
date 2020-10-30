let drawingMode = false;

const circleBtn = document.getElementById('circle_tool').addEventListener('click', function() {
    toggleDrawingMode(this);
});

const rectangleBtn = document.getElementById('rectangle_tool').addEventListener('click', function() {
    toggleDrawingMode(this);
});

const triangleBtn = document.getElementById('triangle_tool').addEventListener('click', function() {
    toggleDrawingMode(this);
});

const polygonBtn = document.getElementById('polygon_tool').addEventListener('click', function() {
    toggleDrawingMode(this);
});

function toggleDrawingMode(e) {
    drawingMode = !drawingMode;
    if (drawingMode) {
        e.classList.add('activated');
    } else {
        e.classList.remove('activated');
    }
}