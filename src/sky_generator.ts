import { create } from "xmlbuilder2";

type StarTuple = [number, number, number];
type XMLBuilderType = ReturnType<typeof create>;

const create_star = (
  x_coord: number,
  y_coord: number,
  radius: number,
  override_attributes: Object = {}
): XMLBuilderType => {
  const curve_1 = `c${radius},0,${radius},0,${radius}-${radius}`;
  const curve_2 = `c0,${radius},0,${radius},${radius},${radius}-${radius},0-${radius},0-${radius},${radius}`;
  const curve_3 = `c0-${radius},0-${radius}-${radius}-${radius}`;
  let star_attributes = {
    d: `M${x_coord},${y_coord}Z${curve_1}${curve_2}${curve_3}`,
    fill: "#fff",
    "fill-opacity": "0.75",
    stroke: "rgba(49,51,82,0.5)",
    "stroke-width": "0.2",
    "stroke-opacity": "0.5",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };
  star_attributes = { ...star_attributes, ...override_attributes };
  const star = create().ele("path", star_attributes);
  return star;
};

// Use central limit theorem to approximate Gaussian distribution over 0, 1
const fast_gaussian_rand = (iterations = 10): number => {
  let random_sum = Math.random();
  for (let iteration = 1; iteration < iterations; iteration++) {
    random_sum += Math.random();
  }
  return random_sum / iterations;
};

const galaxy_distribution = (
  width: number,
  height: number,
  num_stars: number,
  debug: boolean = false,
  max_failed_iterations: number = 5000,
  radius_array = [10, 15, 20]
): StarTuple[] => {
  const distribution: StarTuple[] = [];
  let failed_iterations = 0;
  let star_idx = 0;
  while (star_idx < num_stars && failed_iterations < max_failed_iterations) {
    const size = radius_array[Math.floor(Math.random() * radius_array.length)];
    const diagonal_random = Math.random();

    let x_coord = width - (size + (width - 2 * size) * diagonal_random);
    let y_coord = size + (height - 2 * size) * diagonal_random;

    const y_offset_max = Math.min(y_coord - size, height - y_coord - size);
    const x_offset_max = (y_offset_max * height) / width;

    const gaussian_offset_rand = 2 * (fast_gaussian_rand(100) - 0.5);
    x_coord = Math.floor(x_coord + x_offset_max * gaussian_offset_rand);
    y_coord = Math.floor(y_coord + y_offset_max * gaussian_offset_rand);

    let new_star_valid = true;

    for (const star_props of distribution) {
      const [star_x, star_y, star_size] = [
        star_props[0],
        star_props[1],
        star_props[2],
      ];
      // Check collisions
      const distance =
        (x_coord - star_x) * (x_coord - star_x) +
        (y_coord - star_y) * (y_coord - star_y);
      const min_offset = 2 * size * size + 2 * star_size * star_size;
      if (distance < min_offset) {
        console.log(
          `Collision detected: star_x: ${star_x}, star_y: ${star_y}, star_size: ${star_size}, x_coord: ${x_coord}, y_coord: ${y_coord}, size: ${size}`
        );
        new_star_valid = false;
        break;
      }
    }

    if (!new_star_valid) {
      failed_iterations++;
      continue;
    }

    const new_star_props: StarTuple = [x_coord, y_coord, size];
    distribution.push(new_star_props);
    star_idx++;
  }
  if (failed_iterations == max_failed_iterations) {
    throw new Error(
      "Max iterations reached, galaxy distribution might not be ideal"
    );
  }
  if (debug) {
    console.log(distribution);
  }
  return distribution;
};

const galaxy_generator = (
  width: number,
  height: number,
  num_stars: number,
  debug: boolean = false
): XMLBuilderType[] => {
  const stars: XMLBuilderType[] = [];
  const distribution = galaxy_distribution(width, height, num_stars, debug);
  for (const star_props of distribution) {
    const [x_coord, y_coord, size] = [
      star_props[0],
      star_props[1],
      star_props[2],
    ];
    const star = create_star(x_coord, y_coord, size);
    stars.push(star);
  }
  return stars;
};

const sky_generator = (
  width: number,
  height: number,
  num_stars: number,
  debug: boolean = false
): string => {
  const stars = galaxy_generator(width, height, num_stars, debug);
  let svg = create({ version: "1.0" }).ele("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: width,
    height: height,
  });
  console.log("");
  for (const star of stars) {
    svg.import(star);
  }
  if (debug) {
    const rectBuilder = svg.ele("rect", {
      width: "100%",
      height: "100%",
      fill: "rgb(0,0,30)",
    });
    svg.node.insertBefore(rectBuilder.node, svg.node.firstChild);
  }
  return svg.end();
};

export default sky_generator;
