#!/bin/bash

echo "========================================"
echo "MORTM Melody Generator - Development Server"
echo "========================================"
echo ""
echo "Starting development server..."
echo "Server will be available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8000
