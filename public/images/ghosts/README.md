# Ghost Images for Ghost Mode

This folder contains the ghost images that appear during Ghost Mode when a user has been purged.

## Current Setup

The system currently uses placeholder SVG images (ghost1.svg through ghost5.svg). These will be replaced with your actual ghost images.

## How to Add Your Ghost Images

1. **Copy your ghost images** from `G:\Chris Home\Pictures\Puurga\Purga Ghosts and Icons\ghost` to this folder
2. **Rename the images** to match the expected filenames:
   - ghost1.png (or .svg) - Uses 'float' animation
   - ghost2.png (or .svg) - Uses 'zigzag' animation  
   - ghost3.png (or .svg) - Uses 'wave' animation
   - ghost4.png (or .svg) - Uses 'spiral' animation
   - ghost5.png (or .svg) - Uses 'float' animation

3. **Supported formats**: PNG, SVG, JPG, JPEG, WebP

## Animation Types

Each ghost has a unique animation pattern:
- **Float**: Smooth floating motion with gentle rotation
- **Zigzag**: Sharp angular movements with dramatic rotations
- **Wave**: Sinusoidal wave pattern with subtle rotations
- **Spiral**: Circular spiral motion with continuous rotation

## Image Specifications

- **Recommended size**: 64x64 pixels (will be scaled automatically)
- **Background**: Should be transparent or have a ghostly appearance
- **Style**: Translucent/ghostly appearance works best

## Testing

To test the Ghost Mode:
1. Trigger Ghost Mode in the application (when a user gets purged)
2. The ghosts should float across the screen with their respective animations
3. Each ghost appears at different times and positions

## File Structure

```
public/images/ghosts/
├── ghost1.svg    # Float animation
├── ghost2.svg    # Zigzag animation  
├── ghost3.svg    # Wave animation
├── ghost4.svg    # Spiral animation
├── ghost5.svg    # Float animation
└── README.md     # This file
```
