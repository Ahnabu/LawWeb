const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Dev only: keep compiled pages in memory longer. By default Next disposes a
  // page after ~1 min idle and deletes its chunk, but the client router still
  // holds the old reference, so navigating back throws ChunkLoadError.
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100,
  },
  // The dashboard booking form was merged into the public /appointment page;
  // keep old links and bookmarks working (query string such as ?lawyerId= is kept).
  async redirects() {
    return [
      { source: "/dashboard/client/appointment", destination: "/appointment", permanent: true },
      { source: "/dashboard/client/book-consultation", destination: "/appointment", permanent: true },
    ];
  },
};

export default nextConfig;
