const fs = require("fs");
import sky_generator from "./sky_generator";

const svg_generator = (width: number, height: number, num_stars: number) => {
  const generated_sky = sky_generator(width, height, num_stars, true);
  fs.writeFile("../test.svg", generated_sky, "utf8", (err: Error) => {
    if (err) {
      console.error("Error writing file: ", err);
      return;
    }
  });
  console.log("File written");
};

svg_generator(1920, 2560, 500);

export default svg_generator;
