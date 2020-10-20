const loadImage = document.getElementById('load_image');
const canvas = document.getElementById('canvas');

// Load Image from Upload File
loadImage.addEventListener('change', e => {
    let file = loadImage.files[0];
    let image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
        let context = canvas.getContext('2d');
        canvas.height = image.height;
        canvas.width = image.width;
        context.drawImage(image, 0, 0);
    }
});

const exposureSlider = document.getElementById('exposure');
exposureSlider.addEventListener('change', () => {
    let exposureValue = exposureSlider.value;
});


