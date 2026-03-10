/**
 * Color helpers and Unicode icons powered by chalk.
 * chalk auto-detects NO_COLOR and non-TTY environments.
 */

import chalk from "chalk";

export const bold = chalk.bold;
export const dim = chalk.dim;
export const green = chalk.green;
export const yellow = chalk.yellow;
export const cyan = chalk.cyan;
export const red = chalk.red;

export const icons = {
  check: green("✔"),
  cross: red("✗"),
  warn: yellow("⚠"),
  info: cyan("ℹ"),
  plus: green("+"),
  arrow: cyan("→"),
};
