const TOKENS = [
  "((((",
  "))))",
  "[[[[",
  "]]]]",
  "/////",
  "*****",
  "#####",
  "()()",
  "<>",
  "&&",
  "||",
  ";;",
  "..",
  "00",
  "11",
  "=>",
  "fn",
  "if",
  "let",
  "const",
  "return",
];

function line(seed: number): string {
  let state = seed >>> 0;
  let text = "";
  while (text.length < 180) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    text += TOKENS[state % TOKENS.length];
    if (state % 5 === 0) {
      text += " ";
    }
  }
  return text.slice(0, 180);
}

const LINES = Array.from({ length: 90 }, (_, index) => line(index + 17));

export function CodeField() {
  return (
    <pre className="code-field" aria-hidden="true">
      {LINES.join("\n")}
    </pre>
  );
}
