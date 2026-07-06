export function h(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const key in attrs) {
      const value = attrs[key];
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in el && key !== 'list') {
        el[key] = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }
  if (children != null) {
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child == null || child === false) continue;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  return el;
}

export function setAttr(el, name, value) {
  if (value == null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? 'true' : String(value));
}

export function toggleClass(el, name, force) {
  el.classList.toggle(name, force);
}

export function empty(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function closest(el, selector) {
  return el && el.closest ? el.closest(selector) : null;
}

let uid = 0;
export function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}-${Date.now().toString(36)}`;
}
