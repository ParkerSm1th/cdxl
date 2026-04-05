#!/usr/bin/env node
import { createProgram } from './index';

createProgram().parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
