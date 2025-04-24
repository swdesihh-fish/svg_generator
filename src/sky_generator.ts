import { error } from "console";
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
    fill: "#ffffffBF",
    stroke: "#31335280",
    "stroke-width": ".2",
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
  max_failed_iterations: number = 100000,
  radius_array: number[] = [10, 15, 20]
): StarTuple[] => {
  const distribution: StarTuple[] = [];
  let failed_iterations = 0;
  let star_idx = 0;

  let radius_total = 0;
  for (let i = 0; i < radius_array.length; i++) {
    radius_total += radius_array[i];
  }

  let radius_weight_denominator = 0;
  for (const radius of radius_array) {
    radius_weight_denominator += radius_total - radius;
  }

  let radius_tracker = new Array(radius_array.length).fill(0);

  const radius_cdf = radius_array.reduce<number[]>((cdf_array, radius, idx) => {
    let probability_weight = radius_total - radius;
    if (idx === 0) {
      cdf_array[idx] = probability_weight;
    } else {
      cdf_array[idx] = cdf_array[idx - 1] + probability_weight;
    }
    return cdf_array;
  }, []);

  while (star_idx < num_stars && failed_iterations < max_failed_iterations) {
    const radius_selection = radius_weight_denominator * Math.random();
    let radius_index = 0;
    for (let i = 0; i < radius_cdf.length; i++) {
      if (radius_selection < radius_cdf[i]) {
        radius_index = i;
        break;
      }
    }

    const size = radius_array[radius_index];

    const diagonal_random_iters = 3;
    let diagonal_random_sum = 0;
    for (let rand_iter = 0; rand_iter < diagonal_random_iters; rand_iter++) {
      diagonal_random_sum += Math.random();
    }
    const diagonal_random = diagonal_random_sum / diagonal_random_iters;

    let x_coord = width - (2 * size + (width - 4 * size) * diagonal_random);
    let y_coord = size + (height - 4 * size) * diagonal_random;

    const y_offset_max = Math.min(y_coord - size, height - y_coord - size);
    const x_offset_max = (y_offset_max * height) / width;

    let gaussian_offset_rand = 0;
    const default_gaussian_iterations = 1000;

    let bulge_min = 0;
    let bulge_max = 1;
    let bulge_center_scale_factor = 4;
    let bulge_mid = (bulge_max + bulge_min) / 2;

    // Denominator maximized at == bulge_mid. Solve for scaling = ax^2 + c.
    // Evaluate Math.abs(diagonal_random - bulge_mid) = x, scaling(0) = bulge_center_scale_factor. scaling(bulge_max - bulge_mid) = 1
    // Square scaling: ax^2 + c = scaling. c = bulge_center_scale_factor, a * (bulge_max-bulge_mid)^2 + b_c_s_f = 1. (1-b_c_s_f) / (bulge_max-bulge_mid) = a
    // scaling = (1 - bulge_center_scale_factor) * x^2 / (bulge_max - bulge_mid) + bulge_center_scale_factor

    const bulge_offset = Math.abs(diagonal_random - bulge_mid);
    let distance_scaling_factor =
      bulge_center_scale_factor +
      ((1 - bulge_center_scale_factor) * bulge_offset * bulge_offset) /
        Math.abs(bulge_max - bulge_mid) +
      bulge_center_scale_factor;

    // Calculating gaussian for offset from center line.
    if (diagonal_random > bulge_min && diagonal_random < bulge_max) {
      let fast_gaussian_iterations = Math.floor(
        default_gaussian_iterations / (distance_scaling_factor / 4)
      );
      gaussian_offset_rand =
        2 * (fast_gaussian_rand(fast_gaussian_iterations) - 0.5);
    } else {
      gaussian_offset_rand =
        2 * (fast_gaussian_rand(default_gaussian_iterations) - 0.5);
    }
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
      const distance_sq =
        (x_coord - star_x) * (x_coord - star_x) +
        (y_coord - star_y) * (y_coord - star_y);

      let min_offset = 0;
      if (diagonal_random > bulge_min && diagonal_random < bulge_max) {
        min_offset =
          (size * size + star_size * star_size) / distance_scaling_factor;
      } else {
        min_offset = size * size + star_size * star_size;
      }
      if (distance_sq < min_offset) {
        if (debug) {
          console.log(
            `Collision detected: star_x: ${star_x}, star_y: ${star_y}, star_size: ${star_size}, x_coord: ${x_coord}, y_coord: ${y_coord}, size: ${size}`
          );
        }
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
    radius_tracker[radius_index] += 1;
    star_idx++;
  }
  if (failed_iterations == max_failed_iterations) {
    let error_message = `Max iterations (${max_failed_iterations}) reached, galaxy distribution might not be ideal. Number of stars: ${distribution.length}`;
    throw new Error(error_message);
  }
  if (debug) {
    for (let i = 0; i < radius_array.length; i++) {
      console.log(`radius: ${radius_array[i]}, count: ${radius_tracker[i]}`);
    }
    console.log(`Failed iterations: ${failed_iterations}`);
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
