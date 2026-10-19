import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger's build container reports far more CPUs than it can actually back with real
  // OS threads — Next.js's page-data-collection worker pool auto-scaled to 63 workers there and
  // crashed with "OS can't spawn worker thread: Resource temporarily unavailable (os error 11)"
  // once the app grew past a certain route count. Capping it keeps the build inside whatever
  // thread budget the container actually has.
  experimental: {
    cpus: 2,
    workerThreads: false,
  },
};

export default nextConfig;
