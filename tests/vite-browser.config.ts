import { defineConfig } from 'vite';

// Browser qualification observes one immutable source tree. A worker-triggered
// development reload must not erase an in-progress cancellation measurement.
export default defineConfig({ server: { hmr: false, watch: null } });
