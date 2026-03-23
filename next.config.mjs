/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Ensure that dependencies are correctly resolved, especially for client-side packages
  transpilePackages: ['react-style-singleton', 'react-remove-scroll', 'get-nonce'],
  // Force trigger build
}

export default nextConfig