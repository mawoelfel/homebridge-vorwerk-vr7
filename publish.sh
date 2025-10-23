#!/bin/bash

# Skript zum automatischen Veröffentlichen des Plugins

echo "🚀 Publishing homebridge-vorwerk-vr7..."

# Repository erstellen (Sie müssen das manuell auf GitHub machen)
echo "⚠️  Bitte erstellen Sie zuerst das Repository auf GitHub:"
echo "    https://github.com/new"
echo "    Name: homebridge-vorwerk-vr7"
read -p "Drücken Sie Enter wenn das Repository erstellt wurde..."

# Git Setup
git init
git add .
git commit -m "Initial release v1.0.0 - Vorwerk VR7 Homebridge Plugin"
git branch -M main
git remote add origin https://github.com/mawoelfel/homebridge-vorwerk-vr7.git
git push -u origin main

echo "✅ Code zu GitHub gepusht!"

# npm veröffentlichen
echo "📦 Veröffentliche auf npm..."
npm publish --access public

echo "✅ Plugin auf npm veröffentlicht!"
echo ""
echo "🎉 Fertig! Ihr Plugin ist jetzt verfügbar:"
echo "   GitHub: https://github.com/mawoelfel/homebridge-vorwerk-vr7"
echo "   npm: https://www.npmjs.com/package/homebridge-vorwerk-vr7"