import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexus.talks — Modern Realtime Messaging',
    short_name: 'Nexus.talks',
    description: 'A private communication sanctuary engineered for deliberate dialogue, tactile elegance, and zero algorithmic noise.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F4F1',
    theme_color: '#542C38',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
