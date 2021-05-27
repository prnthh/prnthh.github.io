const withSass = require("@zeit/next-sass");
const withTM = require('next-transpile-modules')(['three'])

// Extend your Next config for advanced behavior
// See https://nextjs.org/docs/api-reference/next.config.js/introduction
let nextConfig = {};

// Add the Next SASS plugin
nextConfig = withSass(withTM(nextConfig));

module.exports = nextConfig;
