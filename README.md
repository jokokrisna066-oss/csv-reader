# csv-reader, faster

A drop-in for `csv-reader` 1.0.0 (make.fun's reference CSV reader) that answers exactly as it
does on every case and reads faster.

`csv-reader-speed-01` ranks entries on CPU time over a drawn set of 6 broken CSV files, and an
entry has to match the reference's answer on every case before its time counts. This entry keeps
the reference's whole broken-row policy and changes only how the text is walked.

## What it does

`run(input)` returns `{columns, rows, errors}` — the same value the reference returns:

- a U+FEFF at the very start is dropped;
- a record ends at LF or CRLF, and a line with no characters is no record;
- outside quotes a CR not followed by LF is dropped (`stray_cr`);
- a field that opens with a quote runs to the next quote that is not doubled, `""` inside it one
  quote, each CRLF or lone CR inside it one LF; what follows its closing quote, up to the next
  comma or line break, is appended as it stands (`quote_junk`); a quote that never closes is a
  literal character and the text after it is read again as unquoted (`unterminated_quote`);
- a quote inside an unquoted field is a literal character; fields stay strings;
- `columns` is the first record when `header` is true, else null; `rows` holds the rest, each
  padded with `""` (`short_row`, with `fields`) or cut (`long_row`, with `extra`) to the first
  record's width;
- each error is `{code, line, row}` in the order met, `line` the 1-based line the record starts
  on (counting every LF, CRLF and lone CR inside quotes), `row` its index in `rows`, null for the
  header.

## What makes it faster

The reference builds every field one character at a time (`value += c`), so a 2 MB file is copied
once per character. This entry walks the same characters but copies each field once:

- a field is scanned with `charCodeAt` to its end and taken with one `slice`;
- a quoted field is copied in runs between quotes and CR/LF, so a long field with no special
  characters is one slice and a plain field is one slice;
- nothing is allocated per character — no rope, no per-character string.

Measured on the practice set (10.2 MB, 6 cases), CPU time net of a do-nothing control, trimmed
mean of 7 runs: **about 0.15 s against the reference's 0.83 s**, ~5x.

## Correctness

The entry is checked against the reference, not against itself:

- the 6 practice cases, all identical (checked by the competition's scorer logic);
- 30,000 randomly built inputs and 29 hand-picked edge cases (empty text, lone BOM, lone quotes,
  stray CRs, junk after a closing quote, CRLF mixes, short and long rows) — all identical;
- two runs on the same set are byte for byte identical.

## Files

- `solve.js` — the entry: `run(input)`, an ES module with no dependencies.
- `main.ts` — the driver the harness runs: reads `/input/cases.json`, writes `/output/answers.json`.
- `vendor/csv-reader/` — csv-reader 1.0.0, kept for reference and for the differential check.

## Licence

MIT (see `LICENSE`). The vendored reference is make.fun's own code (MIT), derived from d3-dsv
3.0.2 (ISC) and papaparse 5.7.1 (MIT); its `LICENSE` and `NOTICE` are kept word for word.