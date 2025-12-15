/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Ensure Three.js is properly externalized
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    return config;
  },
  // Disable server-side rendering for pages that use Three.js
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;

