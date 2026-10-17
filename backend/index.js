require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

let app;
if (isProduction) {
  const mod = require("./dist/server.js");
  app = mod.default || mod.app || mod;
} else {
  require("ts-node/register");
  const mod = require("./src/server.ts");
  app = mod.default || mod.app || mod;
}

module.exports = app;

