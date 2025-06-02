"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
exports.default = (0, vite_1.defineConfig)({
    server: {
        port: 5174,
        proxy: {
            '/api': 'http://localhost:3000'
        }
    }
});
