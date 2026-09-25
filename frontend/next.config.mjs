const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
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
