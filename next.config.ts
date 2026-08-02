import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // giscus fetches the custom theme from inside its own iframe on
        // giscus.app. Serving it with an explicit cross-origin header removes
        // one way for the comment widget to silently fall back to its default
        // look, and this file contains nothing sensitive.
        source: '/giscus.css',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://giscus.app' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ]
  },
}

export default nextConfig
