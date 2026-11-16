/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@gorules/zen-engine'],
  async redirects() {
    return [
      {
        source: '/app',
        destination: '/investimentos/objetivos',
        permanent: true,
      },
      {
        source: '/app/comparador',
        destination: '/produtos/renda-fixa',
        permanent: true,
      },
      {
        source: '/app/minhas-simulacoes',
        destination: '/investimentos/objetivos',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
