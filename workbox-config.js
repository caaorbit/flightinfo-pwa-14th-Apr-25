module.exports = {
    globDirectory: 'build/', // look into the build folder and prepare files inside for offline use
    globPatterns: [
        '**/*.{js,css,html,png,ico,svg,json,txt}' // <- these type of files only
    ],
    swDest: 'build/service-worker.js', // <- generate the final service worker file inside the build folder
    runtimeCaching: [
        {
            // Updated to match aviationstack.com
            urlPattern: /^https:\/\/api\.aviationstack\.com\/v1\/flights.*$/,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'flight-api-cache',
                expiration: {
                    maxEntries: 50, // <- will store max 50 responses. if 50> then it will start deleting..
                    maxAgeSeconds: 60 * 30 // 30 minutes - if cache responses are older than 30 mins, it will automatically get deleted
                }
            }
        },
        {
            // Google Fonts (example)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
                cacheName: 'google-fonts',
                expiration: {
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
            }
        }
    ]
};
