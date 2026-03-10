#!/usr/bin/env node

/**
 * CLI entry point for cc-kit.
 * Registers init, update, and status subcommands via commander.
 */

import { program } from "commander";
import { init } from "../src/commands/init.js";
import { update } from "../src/commands/update.js";
import { status } from "../src/commands/status.js";

program
  .name("cc-kit")
  .description("CLI tool to install and manage AI coding skills across IDEs")
  .version("0.2.0", "-v, --version", "Display version number");

program
  .command("init")
  .description("Install skills into your project (interactive target selection)")
  .option("-f, --force", "Re-download even if skills exist")
  .action(init);

program
  .command("update")
  .description("Update skills to the latest version")
  .action(update);

program
  .command("status")
  .description("Check installation status")
  .action(status);

program.parse();
