#!/bin/bash
API_KEY="AIzaSyCaEuxq1DDluYr0RUEkuf_X1uHDW4KeqvY"

echo "--- Testing List Models ---"
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}" > models_response.json
cat models_response.json

echo -e "\n\n--- Testing Generate Content (Gemini 1.5 Flash) ---"
curl -s -H 'Content-Type: application/json' \
    -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}" > generate_response.json
cat generate_response.json
