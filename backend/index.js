require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  require('./dist/server.js');
} else {
  require('ts-node/register');
  require('./src/server.ts');
}