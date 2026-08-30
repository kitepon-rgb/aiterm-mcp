import { posix } from 'node:path';
import { parseFragment } from 'parse5';
import parseSrcset from 'parse-srcset';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const markdownParser = unified().use(remarkParse).use(remarkGfm);

export function documentTargets(source) {
  const tree = markdownParser.parse(source);
  const definitions = new Map();

  walkMarkdown(tree, (node) => {
    if (node.type === 'definition'
      && typeof node.identifier === 'string'
      && typeof node.url === 'string'
      && !definitions.has(node.identifier)) {
      definitions.set(node.identifier, node.url);
    }
  });

  const targets = [];
  walkMarkdown(tree, (node) => {
    if ((node.type === 'link' || node.type === 'image') && typeof node.url === 'string') {
      targets.push(node.url);
    } else if ((node.type === 'linkReference' || node.type === 'imageReference')
      && typeof node.identifier === 'string') {
      const target = definitions.get(node.identifier);
      if (target !== undefined) targets.push(target);
    } else if (node.type === 'html' && typeof node.value === 'string') {
      targets.push(...htmlTargets(node.value));
    }
  });
  return targets;
}

export function assertPackedMarkdownClosed(files, markdownPath, source) {
  const packedFiles = [...files];
  for (const rawTarget of documentTargets(source)) {
    const target = packedTarget(markdownPath, rawTarget);
    if (target === null || target === '.') continue;
    if (!files.has(target) && !packedFiles.some((file) => file.startsWith(`${target}/`))) {
      throw new Error(
        `${markdownPath}の相対link ${rawTarget} はnpm pack内の${target}で解決できません`,
      );
    }
  }
}

function htmlTargets(source) {
  const targets = [];
  walkHtml(parseFragment(source), (node) => {
    for (const attribute of node.attrs ?? []) {
      if (attribute.name === 'href' || attribute.name === 'src') {
        targets.push(attribute.value);
      } else if (attribute.name === 'srcset') {
        targets.push(...parseSrcset(attribute.value).map((candidate) => candidate.url));
      }
    }
  });
  return targets;
}

function packedTarget(markdownPath, rawTarget) {
  const raw = rawTarget.trim();
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(raw)) return null;

  const pathname = raw.split('#', 1)[0].split('?', 1)[0];
  if (!pathname) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Error(`${markdownPath}に不正なlink URIがあります: ${rawTarget}`);
  }

  const normalized = posix.normalize(decoded.startsWith('/')
    ? decoded.slice(1)
    : posix.join(posix.dirname(markdownPath), decoded));
  const target = normalized === '.' ? normalized : normalized.replace(/\/+$/, '');
  if (target === '..' || target.startsWith('../')) {
    throw new Error(`${markdownPath}がpackage外を参照しています: ${rawTarget}`);
  }
  return target;
}

function walkMarkdown(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walkMarkdown(child, visit);
}

function walkHtml(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walkHtml(child, visit);
  if (node.content) walkHtml(node.content, visit);
}
