import pc from "picocolors";

const useColor = pc.isColorSupported;

function wrap(open: string, close = "\x1b[0m") {
  return (str: string | number) => (useColor ? `${open}${str}${close}` : String(str));
}

// Lime (256-color 154) to match the web theme's #c6f24e.
export const lime = wrap("\x1b[38;5;154m");
export const limeBold = wrap("\x1b[1;38;5;154m");
export const dim = (s: string | number) => pc.dim(String(s));
export const bold = (s: string | number) => pc.bold(String(s));
export const white = (s: string | number) => pc.white(String(s));
export const gray = (s: string | number) => pc.gray(String(s));
export const red = (s: string | number) => pc.red(String(s));
export const yellow = (s: string | number) => pc.yellow(String(s));
export const green = (s: string | number) => pc.green(String(s));

/** A dim monospace label like the site's uppercase micro-labels. */
export function label(s: string): string {
  return dim(s.toUpperCase());
}

export function rule(width = 64): string {
  return dim("\u2500".repeat(width));
}

export function heading(tag: string, title: string): string {
  return `${lime(`[ ${tag.toUpperCase()} ]`)}\n${bold(title)}`;
}

export function kv(k: string, v: string, pad = 20): string {
  return `  ${gray(k.padEnd(pad))} ${v}`;
}
