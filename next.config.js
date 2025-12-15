/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages configuration
  basePath: process.env.NODE_ENV === 'production' ? '/Tiny_TextToInputData_Prototype' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Tiny_TextToInputData_Prototype' : '',
  output: 'export',
  images: {
    unoptimized: true,
  },
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

