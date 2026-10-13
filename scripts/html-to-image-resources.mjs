import { readFile } from 'node:fs/promises';

// Allow native map capture to use the same restricted background image reader
// as structured photos. Other resources retain the library's normal behavior.
export const htmlToImageResources = {
  name: 'html-to-image-resources',
  setup(build) {
    build.onLoad({ filter: /html-to-image\/es\/dataurl\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      const boundary = 'export async function resourceToDataURL(resourceUrl, contentType, options) {';
      if (!source.includes(boundary)) throw new Error('html-to-image resource loader changed; review the compatibility patch.');
      return { loader: 'js', contents: source.replace(boundary, `${boundary}
        if (options.resourceLoader) {
          const supplied = await options.resourceLoader(resourceUrl, contentType);
          if (typeof supplied === 'string') return supplied;
        }`) };
    });
  },
};
