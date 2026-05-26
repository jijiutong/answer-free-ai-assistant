import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'path';
import { copyFileSync, mkdirSync, existsSync, renameSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Plugin to copy static files and fix HTML paths
function copyStaticFiles() {
  return {
    name: 'copy-static',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');

      // Copy manifest
      copyFileSync('manifest.json', resolve(outDir, 'manifest.json'));

      // Copy icons
      const iconsDir = resolve(outDir, 'icons');
      mkdirSync(iconsDir, { recursive: true });
      copyFileSync('public/icons/icon16.png', resolve(iconsDir, 'icon16.png'));
      copyFileSync('public/icons/icon48.png', resolve(iconsDir, 'icon48.png'));
      copyFileSync('public/icons/icon128.png', resolve(iconsDir, 'icon128.png'));

      // Copy background & content scripts
      copyFileSync('src/background.js', resolve(outDir, 'background.js'));
      copyFileSync('src/content/content.js', resolve(outDir, 'content.js'));

      // Move HTML files to dist root
      const popupHtml = resolve(outDir, 'src/popup/index.html');
      const sidepanelHtml = resolve(outDir, 'src/sidepanel/index.html');
      if (existsSync(popupHtml)) {
        renameSync(popupHtml, resolve(outDir, 'popup.html'));
      }
      if (existsSync(sidepanelHtml)) {
        renameSync(sidepanelHtml, resolve(outDir, 'sidepanel.html'));
      }
      // Clean up src directory in dist
      rmSync(resolve(outDir, 'src'), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [vue(), copyStaticFiles()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
