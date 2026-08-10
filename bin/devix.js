#!/usr/bin/env node

const { main } = require("../src/cli");

main(process.argv.slice(2)).catch((error) => {
  const payload = {
    error: error.code || "DEVIX_ERROR",
    message: error.message,
  };
  if (error.details) {
    payload.details = error.details;
  }
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = error.exitCode || 1;
});
