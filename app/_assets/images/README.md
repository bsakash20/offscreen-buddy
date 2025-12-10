# App Assets Requirements

This directory contains SVG placeholders for the required app assets. These need to be converted to PNG format before building:

## Required Files:
1. `icon.png` - 1024x1024px main app icon
2. `adaptive-icon.png` - 1024x1024px Android adaptive icon  
3. `splash-icon.png` - 1024x1024px splash screen image
4. `favicon.png` - 512x512px web favicon

## Design Specifications:
- Primary color: #B8A7D6 (Lavender)
- Background: #FBF9F7 (Cream) 
- Logo: "OB" (OffScreen Buddy)
- Font: System fonts (Arial fallback)

## Conversion Instructions:
1. Convert all SVG files to PNG using tools like:
   - ImageMagick: `convert icon.png.svg icon.png`
   - Online converters
   - Design software (Figma, Sketch, etc.)

2. Ensure proper dimensions:
   - Icon: 1024x1024px @1x, 2048x2048px @2x
   - Splash: 1024x1024px 
   - Favicon: 512x512px @1x, 1024x1024px @2x

3. Optimize file sizes for web and mobile delivery