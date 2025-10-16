#!/bin/sh
# Custom entrypoint pour Nginx ReContent
# Supprime le default.conf avant de démarrer

echo "🔧 ReContent Nginx - Removing default.conf..."
rm -f /etc/nginx/conf.d/default.conf

echo "✅ Starting Nginx..."
exec nginx -g 'daemon off;'
