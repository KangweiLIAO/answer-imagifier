import { readFile } from 'node:fs/promises';

// html-to-image 1.11.13 reuses a global format matcher across font-face rules.
// Reset it per src declaration so regular/italic faces do not lose their src
// depending on the order in which the preceding face matched woff2.
export const htmlToImageFonts = {
  name: 'html-to-image-fonts',
  setup(build) {
    build.onLoad({ filter: /html-to-image\/es\/embed-resources\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      const boundary = 'str.replace(FONT_SRC_REGEX, (match) => {';
      if (!source.includes(boundary)) throw new Error('html-to-image font filtering changed; review the compatibility patch.');
      return { loader: 'js', contents: source.replace(boundary, `${boundary}\n            URL_WITH_FORMAT_REGEX.lastIndex = 0;`) };
    });
  },
};
