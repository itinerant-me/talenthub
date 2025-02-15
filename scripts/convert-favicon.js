const sharp = require('sharp');
const fs = require('fs');

// Convert SVG to PNG for apple-touch-icon
sharp('public/icon.svg')
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png')
  .then(() => console.log('Created apple-touch-icon.png'))
  .catch(err => console.error('Error creating apple-touch-icon.png:', err));

// Create favicon.ico (32x32)
sharp('public/icon.svg')
  .resize(32, 32)
  .png()
  .toFile('public/favicon.png')
  .then(() => console.log('Created favicon.png'))
  .catch(err => console.error('Error creating favicon.png:', err)); 