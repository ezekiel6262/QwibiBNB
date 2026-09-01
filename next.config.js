/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/jobs": ["./node_modules/plotly.js-basic-dist-min/plotly-basic.min.js"],
    "/api/x402/text-to-sql-bi": ["./node_modules/plotly.js-basic-dist-min/plotly-basic.min.js"],
  },
};

module.exports = nextConfig;
