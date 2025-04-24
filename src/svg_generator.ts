const fs = require("fs");
import sky_generator from "./sky_generator";

const svg_generator = (
  width: number,
  height: number,
  num_stars: number,
  filepath: string,
  debug: boolean
) => {
  const generated_sky = sky_generator(width, height, num_stars, debug);
  fs.writeFile(filepath, generated_sky, "utf8", (err: Error) => {
    if (err) {
      console.error("Error writing file: ", err);
      return;
    }
  });
  console.log(`File written: ${filepath}`);
};

svg_generator(1920, 3840, 2000, "../starry_night_prod.svg", false);

export default svg_generator;
