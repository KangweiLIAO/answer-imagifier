import { readFile } from 'node:fs/promises';

// html-to-image 1.11.13 resolves CSS resources with a temporary <base>,
// which inherits the host's base-uri CSP. Replace only this helper at build
// time; leave installed dependencies and all other rendering logic intact.
export const htmlToImageCsp = {
  name: 'html-to-image-csp',
  setup(build) {
    build.onLoad({ filter: /html-to-image\/es\/util\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      const helper = /^export function resolveUrl\(url, baseUrl\) \{[\s\S]*?\n\}/;
      if (!helper.test(source)) throw new Error('html-to-image resolveUrl changed; review the CSP compatibility patch.');
      return {
        loader: 'js',
        contents: source.replace(helper, `export function resolveUrl(url, baseUrl) {
          if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
          return new URL(url, baseUrl || document.baseURI).href;
        }`),
      };
    });
  },
};
