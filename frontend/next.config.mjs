/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
  async headers() {
    return [
      {
        // Firebase's signInWithPopup polls window.closed on the popup it opens;
        // Chrome's default Cross-Origin-Opener-Policy blocks that cross-origin
        // check unless the parent page explicitly allows popup communication.
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ];
  },
};

export default nextConfig;
