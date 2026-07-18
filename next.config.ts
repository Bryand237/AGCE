import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Indispensable pour le Dockerfile multi-stage : sans ça, .next/standalone
  // n'existe pas et l'étape "runner" du Dockerfile échoue silencieusement.
  output: 'standalone',
}

export default nextConfig
