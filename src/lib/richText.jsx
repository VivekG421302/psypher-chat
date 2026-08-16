/**
 * WhatsApp-style single-character inline formatting shared between the
 * message input (contentEditable, live auto-format) and the message
 * bubbles (final rendering).
 *
 *   *bold*   _italic_   ~strikethrough~   #underline#
 *
 * These can be freely combined/nested, e.g. "*_bold italic_*".
 */

const DELIMS = ['*', '_', '~', '#'];
const REACT_TAG = { '*': 'strong', _: 'em', '~': 'del', '#': 'u' };
const REACT_CLASS = { '*': 'font-bold', _: 'italic', '~': 'line-through', '#': 'underline' };
const HTML_TAG = { '*': 'b', _: 'i', '~': 's', '#': 'u' };

function isWs(ch) {
  return ch === undefined || /\s/.test(ch);
}

/**
 * Tokenize a single line of markdown into a small tree of
 * { t: 'text', v } | { t: 'mark', d, children } nodes.
 * A delimiter only "opens" if immediately followed by a non-space char,
 * and only "closes" if immediately preceded by a non-space char — this
 * avoids treating stray characters like "5 * 3" as formatting.
 */
function tokenizeInline(text) {
  const nodes = [];
  let buf = '';
  let i = 0;

  function flush() {
    if (buf) {
      nodes.push({ t: 'text', v: buf });
      buf = '';
    }
  }

  while (i < text.length) {
    const ch = text[i];
    if (DELIMS.includes(ch)) {
      const nextChar = text[i + 1];
      const canOpen = !isWs(nextChar) && nextChar !== ch;
      if (canOpen) {
        let j = i + 1;
        let closeIdx = -1;
        while (j < text.length) {
          if (text[j] === ch && !isWs(text[j - 1])) {
            closeIdx = j;
            break;
          }
          j += 1;
        }
        if (closeIdx !== -1 && closeIdx > i + 1) {
          flush();
          const inner = text.slice(i + 1, closeIdx);
          nodes.push({ t: 'mark', d: ch, children: tokenizeInline(inner) });
          i = closeIdx + 1;
          continue;
        }
      }
    }
    buf += ch;
    i += 1;
  }
  flush();
  return nodes;
}

/** Render a single line of markdown into React nodes for display. */
export function renderInlineMarkdown(text, keyPrefix = 'i') {
  const tree = tokenizeInline(text || '');
  let key = 0;
  function toReact(nodes) {
    return nodes.map((n) => {
      if (n.t === 'text') return n.v;
      const Tag = REACT_TAG[n.d];
      return (
        <Tag key={`${keyPrefix}-${key++}`} className={REACT_CLASS[n.d]}>
          {toReact(n.children)}
        </Tag>
      );
    });
  }
  const rendered = toReact(tree);
  return rendered.length ? rendered : text;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMarkdownToHtml(text) {
  const tree = tokenizeInline(text || '');
  function toHtml(nodes) {
    return nodes.map((n) => {
      if (n.t === 'text') return escapeHtml(n.v);
      const tag = HTML_TAG[n.d];
      return `<${tag}>${toHtml(n.children)}</${tag}>`;
    }).join('');
  }
  return toHtml(tree);
}

/** Convert a full stored markdown message into contentEditable-ready HTML. */
export function markdownToHtml(fullText) {
  const lines = (fullText || '').split('\n');
  const listRe = /^\d+\.\s(.*)$/;
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(listRe);
    if (m) {
      const items = [];
      while (i < lines.length) {
        const mm = lines[i].match(listRe);
        if (!mm) break;
        items.push(mm[1]);
        i += 1;
      }
      html += `<ol>${items.map((it) => `<li>${inlineMarkdownToHtml(it) || '<br>'}</li>`).join('')}</ol>`;
    } else {
      html += `<div>${inlineMarkdownToHtml(lines[i]) || '<br>'}</div>`;
      i += 1;
    }
  }
  return html || '<br>';
}

function buildInlineDom(text) {
  const tree = tokenizeInline(text || '');
  const frag = document.createDocumentFragment();
  function append(nodes, parent) {
    nodes.forEach((n) => {
      if (n.t === 'text') {
        parent.appendChild(document.createTextNode(n.v));
      } else {
        const el = document.createElement(HTML_TAG[n.d]);
        append(n.children, el);
        parent.appendChild(el);
      }
    });
  }
  append(tree, frag);
  return frag;
}

function inlineDomToMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const tag = node.tagName.toLowerCase();
  const inner = Array.from(node.childNodes).map(inlineDomToMarkdown).join('');
  if (!inner) return '';
  switch (tag) {
    case 'b':
    case 'strong':
      return `*${inner}*`;
    case 'i':
    case 'em':
      return `_${inner}_`;
    case 's':
    case 'strike':
    case 'del':
      return `~${inner}~`;
    case 'u':
      return `#${inner}#`;
    default:
      return inner;
  }
}

/** Serialize a contentEditable root back into plain-text markdown for sending. */
export function domToMarkdown(root) {
  const lines = [];
  let current = '';

  function flush() {
    lines.push(current);
    current = '';
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      current += node.textContent;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();

    if (tag === 'br') {
      flush();
      return;
    }
    if (tag === 'ol' || tag === 'ul') {
      if (current) flush();
      Array.from(node.children).forEach((li, idx) => {
        const text = Array.from(li.childNodes).map(inlineDomToMarkdown).join('');
        lines.push(`${idx + 1}. ${text}`);
      });
      return;
    }
    if (tag === 'div' || tag === 'p') {
      if (current) flush();
      Array.from(node.childNodes).forEach(walk);
      flush();
      return;
    }
    current += inlineDomToMarkdown(node);
  }

  Array.from(root.childNodes).forEach(walk);
  if (current || lines.length === 0) flush();
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();

  return lines.join('\n');
}

function normalizeCaretToTextPosition(range) {
  const { startContainer, startOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    return { node: startContainer, offset: startOffset };
  }
  // Caret is expressed as (element, childIndex) — resolve it to the end of
  // the preceding text node, which is what a real keystroke would produce.
  if (startContainer.nodeType === Node.ELEMENT_NODE && startOffset > 0) {
    let prev = startContainer.childNodes[startOffset - 1];
    while (prev && prev.nodeType === Node.ELEMENT_NODE && prev.lastChild) prev = prev.lastChild;
    if (prev && prev.nodeType === Node.TEXT_NODE) {
      return { node: prev, offset: prev.textContent.length };
    }
  }
  return null;
}

/**
 * Called on every `input` event. If the character just typed closed a valid
 * *bold*, _italic_, ~strike~, or #underline# run within the *same* text
 * node, converts it live into the matching element and drops the caret
 * right after it — mirrors WhatsApp-style auto-formatting.
 */
export function autoFormatEmphasis() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const pos = normalizeCaretToTextPosition(sel.getRangeAt(0));
  if (!pos) return false;
  const { node, offset } = pos;
  const text = node.textContent;
  const justTyped = text[offset - 1];
  if (!DELIMS.includes(justTyped)) return false;
  if (isWs(text[offset - 2])) return false; // nothing meaningful before the closer

  let openIdx = -1;
  for (let k = offset - 2; k >= 0; k -= 1) {
    if (text[k] === justTyped) {
      const nextChar = text[k + 1];
      if (!isWs(nextChar) && nextChar !== justTyped) openIdx = k;
      break; // stop at the nearest earlier occurrence either way
    }
  }
  if (openIdx === -1) return false;

  const beforeText = text.slice(0, openIdx);
  const inner = text.slice(openIdx + 1, offset - 1);
  const afterText = text.slice(offset);

  const parent = node.parentNode;
  const frag = document.createDocumentFragment();
  if (beforeText) frag.appendChild(document.createTextNode(beforeText));
  const el = document.createElement(HTML_TAG[justTyped]);
  el.appendChild(buildInlineDom(inner));
  frag.appendChild(el);
  const caretAnchor = document.createTextNode(afterText);
  frag.appendChild(caretAnchor);
  parent.replaceChild(frag, node);

  const newRange = document.createRange();
  newRange.setStart(caretAnchor, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
  return true;
}

/**
 * Called on every `input` event. If the current line/block is exactly
 * "1. " (just typed), converts it into a native ordered list — the browser
 * then handles auto-incrementing on Enter and exiting the list on a second
 * empty Enter for free.
 */
export function startNumberedListIfMatched(editorEl) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const node = sel.getRangeAt(0).startContainer;
  let blockEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (blockEl && blockEl !== editorEl && blockEl.parentElement !== editorEl) {
    blockEl = blockEl.parentElement;
  }
  const target = blockEl && blockEl !== editorEl ? blockEl : editorEl;
  const text = target.textContent;
  if (!/^1\.\s$/.test(text || '')) return false;

  target.textContent = '';
  // Clearing textContent invalidates any existing selection range, so
  // re-place the caret inside the now-empty block before converting it.
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  editorEl.focus();

  document.execCommand('insertOrderedList');
  return true;
}
