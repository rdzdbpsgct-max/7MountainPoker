/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  build: {
    // Support older iPads (iPadOS 15+) — Vite 7 defaults to safari16
    target: ['es2020', 'safari14'],
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/node_modules/react/')
            || id.includes('/node_modules/react-dom/')
            || id.includes('/node_modules/scheduler/')) {
            return 'vendor-react';
          }

          if (id.includes('/node_modules/@sentry/browser/') || id.includes('/node_modules/@sentry/react/')) return 'vendor-sentry-browser';
          if (id.includes('/node_modules/@sentry/core/')) return 'vendor-sentry-core';
          if (id.includes('/node_modules/@sentry/utils/')) return 'vendor-sentry-utils';
          if (id.includes('/node_modules/@sentry-internal/')) return 'vendor-sentry-internal';
          if (id.includes('/node_modules/@sentry/')) return 'vendor-sentry';

          if (id.includes('/node_modules/@vercel/analytics/')
            || id.includes('/node_modules/@vercel/speed-insights/')) {
            return 'vendor-vercel';
          }
          if (id.includes('/node_modules/peerjs/')) return 'vendor-peerjs';
          if (id.includes('/node_modules/qrcode.react/')) return 'vendor-qrcode';
          if (id.includes('/node_modules/idb/')) return 'vendor-idb';
          if (id.includes('/node_modules/html-to-image/')) return 'vendor-screenshot';
          if (id.includes('/node_modules/jspdf/') || id.includes('/node_modules/jspdf-autotable/')) {
            return 'vendor-pdf';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '7Mountain Poker - Tournament Timer',
        short_name: '7Mountain Poker',
        description: 'Poker tournament timer for home games',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'any',
        start_url: basePath,
        scope: basePath,
        categories: ['games', 'utilities'],
        shortcuts: [
          {
            name: 'Neues Turnier / New Tournament',
            short_name: 'Start',
            url: basePath,
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,mp3}'],
        runtimeCaching: [
          {
            urlPattern: /\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 800,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Keep Playwright specs and worktrees out of Vitest to avoid cross-runner collisions.
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', '.worktrees/**'],
  },
})
