import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import UnoCSS from '@unocss/vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        contentExtractor: resolve(__dirname, 'src/content/contentExtractor.ts'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'contentExtractor') return 'contentExtractor.js';
          return '[name].js';
        },
        assetFileNames: '[name].[ext]'
      }
    }
  },
  publicDir: 'public',
  plugins: [
    UnoCSS(),
    {
      name: 'generate-build-info',
      buildStart() {
        const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
        const buildDate = new Date().toISOString();
        const buildInfo = {
          version: packageJson.version,
          buildDate,
          buildTime: new Date(buildDate).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        };
        
        const buildInfoContent = `// Auto-generated build info
export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)};
`;
        writeFileSync('./src/utils/buildInfo.ts', buildInfoContent);
        
        // Update manifest.json version
        const manifestPath = './public/manifest.json';
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        manifest.version = packageJson.version;
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      }
    },
    {
      name: 'copy-html-files',
      closeBundle() {
        copyFileSync('dist/src/popup/popup.html', 'dist/popup.html');
        copyFileSync('dist/src/options/options.html', 'dist/options.html');
      }
    }
  ]
});