import { readFile } from 'node:fs/promises';

// html-to-image clones DOM but not a container's scroll position. Offset its
// already-styled children inside the clone; never scroll the source widget.
export const htmlToImageScroll = {
  name: 'html-to-image-scroll',
  setup(build) {
    build.onLoad({ filter: /html-to-image\/es\/clone-node\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      const boundary = '.then((clonedNode) => ensureSVGSymbols(clonedNode, options))';
      if (!source.includes(boundary)) throw new Error('html-to-image clone pipeline changed; review scroll capture patch.');
      return { loader: 'js', contents: source.replace(boundary, `.then((clonedNode) => {
        if (options.preserveScrollPositions && (node.scrollLeft || node.scrollTop)) {
          for (const child of Array.from(clonedNode.children || [])) {
            if (!child.style || child.nodeName === 'STYLE') continue;
            const transform = child.style.transform;
            child.style.transform = 'translate(' + (-node.scrollLeft) + 'px,' + (-node.scrollTop) + 'px) ' + (transform === 'none' ? '' : transform);
          }
        }
        return clonedNode;
      })\n        ${boundary}`) };
    });
  },
};
