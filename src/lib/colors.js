/**
 * Color helpers and text-based status indicators powered by chalk.
 * chalk auto-detects NO_COLOR and non-TTY environments.
 *
 * All output indicators use plain text -- no emoji/Unicode symbols.
 */

import chalk from "chalk";

// Text formatting
export const bold = chalk.bold;
export const dim = chalk.dim;

// Semantic colors
export const green = chalk.green;
export const yellow = chalk.yellow;
export const cyan = chalk.cyan;
export const red = chalk.red;

/** Text-based status indicators used throughout CLI output. */
export const icons = {
  check: green("[OK]"),
  cross: red("[FAIL]"),
  warn: yellow("[WARN]"),
  info: cyan("[INFO]"),
  plus: green("[+]"),
  arrow: cyan("->"),
};
