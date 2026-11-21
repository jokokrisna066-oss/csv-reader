// Candidate B: manual charCodeAt loop, no regex, no indexOf — slices only.
const COMMA = 0;
const BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = n > 0 && text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;

  let val = '';
  let added = 0;
  let ended = END;

  function err(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  function readUnquoted(prefix) {
    const origStart = pos;
    let strays = 0;
    let parts = null;
    let start = pos;
    let end = n;
    ended = END;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        end = pos;
        ended = COMMA;
        pos += 1;
        break;
      }
      if (c === 10) {
        end = pos;
        ended = BREAK;
        pos += 1;
        line += 1;
        break;
      }
      if (c === 13) {
        if (pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
          end = pos;
          ended = BREAK;
          pos += 2;
          line += 1;
          break;
        }
        if (parts === null) parts = [];
        parts.push(text.slice(start, pos));
        err('stray_cr');
        strays += 1;
        pos += 1;
        start = pos;
        continue;
      }
      pos += 1;
    }
    if (parts === null) val = prefix + text.slice(start, end);
    else {
      parts.push(text.slice(start, end));
      val = prefix + parts.join('');
    }
    added = end - origStart - strays;
  }

  function readQuoted() {
    const open = pos;
    const openLine = line;
    pos = open + 1;
    let start = pos;
    let parts = null;
    let closed = false;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 34) {
        if (pos + 1 < n && text.charCodeAt(pos + 1) === 34) {
          if (parts === null) parts = [];
          parts.push(text.slice(start, pos), '"');
          pos += 2;
          start = pos;
          continue;
        }
        pos += 1;
        closed = true;
        break;
      }
      if (c === 13) {
        if (parts === null) parts = [];
        parts.push(text.slice(start, pos), '\n');
        pos += pos + 1 < n && text.charCodeAt(pos + 1) === 10 ? 2 : 1;
        start = pos;
        line += 1;
        continue;
      }
      if (c === 10) line += 1;
      pos += 1;
    }
    if (!closed) {
      pos = open + 1;
      line = openLine;
      err('unterminated_quote');
      readUnquoted('"');
      return;
    }
    if (parts === null) val = text.slice(open + 1, pos - 1);
    else {
      parts.push(text.slice(start, pos - 1));
      val = parts.join('');
    }
    if (pos >= n) {
      ended = END;
      return;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      ended = COMMA;
      return;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      ended = BREAK;
      return;
    }
    if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      ended = BREAK;
      return;
    }
    readUnquoted(val);
    if (added > 0) err('quote_junk');
  }

  while (true) {
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && pos + 1 < n && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;

    const fields = [];
    let lastQuoted = false;
    do {
      lastQuoted = pos < n && text.charCodeAt(pos) === 34;
      if (lastQuoted) readQuoted();
      else readUnquoted('');
      fields.push(val);
    } while (ended === COMMA);

    if (fields.length === 1 && fields[0] === '' && !lastQuoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}