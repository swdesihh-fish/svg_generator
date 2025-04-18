const fs = require('fs');
import sky_generator from './sky_generator';

const svg_generator = () => {
    const generated_sky = sky_generator(1920, 2560, 200);
    fs.writeFile('../test.svg', generated_sky, 'utf8', (err: Error) => {
        if (err) {
            console.error('Error writing file: ', err);
            return;
        }
    });
}

export default svg_generator;