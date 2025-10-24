/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  
  webpack: (config, { isServer, dev }) => {
    // OneDrive sorunları için
    config.resolve.symlinks = false;
    
    // Development'ta daha az modül yükle
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig