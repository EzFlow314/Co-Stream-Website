import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  // Force tsup to bundle these internal packages instead of leaving them external
  noExternal: ['contracts', 'shared'], 
});
