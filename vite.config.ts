import { svelte } from '@sveltejs/vite-plugin-svelte';

import { defineConfig } from 'vite';
// import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [svelte({})],
	resolve: {
		alias: {
			src: '/src'
		}
	},
	test: {
		// include: ['src/**/*.{test,spec}.{js,ts}']
	},
	build: {
		lib: {
			entry: 'src/lib/index.ts',
			name: 'elelem.ts'
		}
	}
});
