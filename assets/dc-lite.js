/* dc-lite: a tiny runtime that renders Vetrail's exported screens with Preact.
   Templates use {{path}} holes, <sc-if value="{{x}}"> and <sc-for list="{{xs}}" as="x">. */
(function () {
  var P = window.preact, h = P.h;
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var decoder = document.createElement('textarea');
  function dec(s) { if (s.indexOf('&') < 0) return s; decoder.innerHTML = s; return decoder.value; }
  function isWs(c) { return c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f'; }

  function parse(src) {
    var root = { kids: [] }, stack = [root], i = 0, n = src.length;
    while (i < n) {
      if (src.startsWith('<!--', i)) { var ce = src.indexOf('-->', i); i = ce < 0 ? n : ce + 3; continue; }
      if (src[i] === '<' && src[i + 1] === '/') {
        var e = src.indexOf('>', i), tag = src.slice(i + 2, e).trim().toLowerCase();
        for (var k = stack.length - 1; k > 0; k--) { if (stack[k].tag === tag) { stack.length = k; break; } }
        i = e + 1; continue;
      }
      if (src[i] === '<' && /[a-zA-Z]/.test(src[i + 1] || '')) {
        var j = i + 1;
        while (j < n && !isWs(src[j]) && src[j] !== '>' && src[j] !== '/') j++;
        var t = src.slice(i + 1, j).toLowerCase(), attrs = [], selfClose = false;
        while (j < n) {
          while (isWs(src[j])) j++;
          if (src[j] === '>') { j++; break; }
          if (src[j] === '/' && src[j + 1] === '>') { j += 2; selfClose = true; break; }
          var a = j;
          while (j < n && !isWs(src[j]) && src[j] !== '=' && src[j] !== '>' && !(src[j] === '/' && src[j + 1] === '>')) j++;
          var name = src.slice(a, j), val = '';
          while (isWs(src[j])) j++;
          if (src[j] === '=') {
            j++; while (isWs(src[j])) j++;
            var q = src[j];
            if (q === '"' || q === "'") { var qe = src.indexOf(q, j + 1); val = src.slice(j + 1, qe); j = qe + 1; }
            else { var ve = j; while (ve < n && !isWs(src[ve]) && src[ve] !== '>') ve++; val = src.slice(j, ve); j = ve; }
          }
          if (name) attrs.push([name, dec(val)]);
        }
        var el = { t: 'el', tag: t, attrs: attrs, kids: [] };
        stack[stack.length - 1].kids.push(el);
        if (t === 'script' || t === 'style' || t === 'textarea') {
          var end = src.toLowerCase().indexOf('</' + t, j);
          if (end < 0) end = n;
          var raw = src.slice(j, end);
          if (raw) el.kids.push({ t: 'tx', v: t === 'textarea' ? dec(raw) : raw });
          i = src.indexOf('>', end) + 1 || n; continue;
        }
        if (!VOID[t] && !selfClose) stack.push(el);
        i = j; continue;
      }
      var te = src.indexOf('<', i + 1); if (te < 0) te = n;
      stack[stack.length - 1].kids.push({ t: 'tx', v: dec(src.slice(i, te)) });
      i = te;
    }
    return root.kids;
  }

  var WHOLE = /^\s*\{\{([^}]*)\}\}\s*$/, HOLE = /\{\{([^}]*)\}\}/g;
  function look(path, sc) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    if (path === 'null') return null; if (path === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.'), v;
    for (var k = sc.length - 1; k >= 0; k--) { if (sc[k] && Object.prototype.hasOwnProperty.call(sc[k], parts[0])) { v = sc[k][parts[0]]; break; } }
    for (var p = 1; p < parts.length; p++) { if (v == null) return undefined; v = v[parts[p]]; }
    return v;
  }
  function interp(s, sc) { return s.replace(HOLE, function (m, p) { var v = look(p, sc); return v == null ? '' : String(v); }); }
  function attrOf(nd, name) { for (var i = 0; i < nd.attrs.length; i++) if (nd.attrs[i][0] === name) return nd.attrs[i][1]; return null; }
  function holeVal(raw, sc) { if (raw == null) return undefined; var m = raw.match(WHOLE); return m ? look(m[1], sc) : raw; }
  var BOOL = { checked: 1, disabled: 1, multiple: 1, selected: 1, required: 1, readonly: 1, hidden: 1, autofocus: 1 };

  function build(nodes, sc, svg) {
    var out = [];
    for (var x = 0; x < nodes.length; x++) {
      var nd = nodes[x];
      if (nd.t === 'tx') { out.push(nd.v.indexOf('{{') >= 0 ? interp(nd.v, sc) : nd.v); continue; }
      var tag = nd.tag;
      if (tag === 'helmet') continue;
      if (tag === 'sc-if') { if (holeVal(attrOf(nd, 'value'), sc)) out.push.apply(out, build(nd.kids, sc, svg)); continue; }
      if (tag === 'sc-for') {
        var list = holeVal(attrOf(nd, 'list'), sc) || [], as = attrOf(nd, 'as') || 'item';
        for (var li = 0; li < list.length; li++) { var frame = { $index: li }; frame[as] = list[li]; out.push.apply(out, build(nd.kids, sc.concat([frame]), svg)); }
        continue;
      }
      var inSvg = svg || tag === 'svg', props = {}, type = (attrOf(nd, 'type') || '').toLowerCase();
      for (var ai = 0; ai < nd.attrs.length; ai++) {
        var name = nd.attrs[ai][0], val = nd.attrs[ai][1];
        if (name.indexOf('hint-') === 0) continue;
        var m = val.match(WHOLE), v = m ? look(m[1], sc) : (val.indexOf('{{') >= 0 ? interp(val, sc) : val), key = name;
        if (/^on[A-Z]/.test(name)) {
          if (typeof v !== 'function') continue;
          if (name === 'onChange' && (tag === 'textarea' || (tag === 'input' && !/^(file|checkbox|radio)$/.test(type)))) key = 'onInput';
        } else if (!m && (tag === 'input' || tag === 'textarea') && name === 'value') {
          key = 'defaultValue';
        } else if (!m && tag === 'input' && name === 'checked') {
          key = 'defaultChecked'; v = true;
        } else if (!m && BOOL[name]) {
          v = true;
        }
        props[key] = v;
      }
      if (tag === 'textarea') {
        var txt = nd.kids.map(function (k) { return k.v || ''; }).join('');
        if (txt && !('value' in props)) props.defaultValue = txt.indexOf('{{') >= 0 ? interp(txt, sc) : txt;
        out.push(h(tag, props));
      } else {
        out.push(h.apply(null, [tag, props].concat(build(nd.kids, sc, inSvg && tag !== 'foreignobject'))));
      }
    }
    return out;
  }

  var TPL = [];
  function DCLogic(props) { P.Component.call(this, props); }
  DCLogic.prototype = Object.create(P.Component.prototype);
  DCLogic.prototype.constructor = DCLogic;
  DCLogic.prototype.render = function () {
    var vals = (this.renderVals && this.renderVals()) || {};
    return h.apply(null, [P.Fragment, null].concat(build(TPL, [vals], false)));
  };
  window.DCLogic = DCLogic;
  window.DCLite = {
    mount: function (Comp, tpl) {
      TPL = parse(tpl);
      P.render(h(Comp, {}), document.getElementById('root'));
    }
  };
})();
