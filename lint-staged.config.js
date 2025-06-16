export default {
  '**/*.{js,jsx,ts,tsx,json,css,scss,md,html,yaml,yml}': (filenames) =>
    filenames.map((filename) => `prettier --write '${filename}'`),
};
