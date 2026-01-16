# The Daily Saint - Simplified Quote Generator

Clean, streamlined version with fixed defaults for batch processing Instagram quote images.

## What's Different in This Version?

### Removed (For Cleaner Code)
- ❌ Fine-tuning sliders for font sizes, margins, spacing
- ❌ Complex UI controls
- ❌ Real-time preview adjustments

### Kept (Core Functionality)
- ✅ Batch image generation
- ✅ Random or manual quote/image selection
- ✅ Film grain toggle
- ✅ ZIP download for batches
- ✅ All the design defaults we established:
  - Quote font: 6% of width (42px at 698px)
  - Attribution: 3.15% of width (22px at 698px)
  - Side margins: 24.2% (169px at 698px)
  - Top/bottom margins: 5.4% (48px at 882px)
  - Line spacing: 120%
  - Icon size: 6.9% (48px at 698px)

## Fixed Defaults

All typography and spacing is standardized based on the percentages we refined:

```python
CONFIG = {
    'canvas_width': 698,
    'canvas_height': 882,
    'output_width': 1080,
    'output_height': 1350,
    
    'quote_font_size_pct': 6.0,
    'attribution_font_size_pct': 3.15,
    'side_margin_pct': 24.2,
    'top_margin_pct': 5.4,
    'bottom_margin_pct': 5.4,
    'line_spacing_pct': 120,
    'icon_size_pct': 6.9,
    
    'text_color': '#F4EFE4',
    'film_grain_opacity': 0.15,
}
```

## Deploy to Streamlit Cloud

### 1. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit - simplified Daily Saint generator"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daily-saint-simple.git
git push -u origin main
```

### 2. Deploy on Streamlit Cloud

1. Go to [share.streamlit.io](https://share.streamlit.io)
2. Sign in with GitHub
3. Click "New app"
4. Select repository: `daily-saint-simple`
5. Main file: `streamlit_app_simplified.py`
6. Click "Deploy"

## Using the App

### Setup (One Time)
1. Upload `saints-quotes.json`
2. Upload fonts (Rhymes VFI Bold & Light)
3. Upload cross icon SVG
4. Upload background images

### Single Image Mode
1. Filter by date/saint
2. Choose quote
3. Select background (random or specific)
4. Generate & download

### Batch Mode
1. Choose number of images (1-50)
2. Filter options (all/today/random)
3. Generate batch
4. Download ZIP file

## File Structure

```
daily-saint-simple/
├── streamlit_app_simplified.py   # Main app (simplified)
├── requirements.txt               # Python dependencies
├── packages.txt                   # System dependencies
└── README.md                      # This file
```

## Benefits of This Version

1. **Cleaner Code** - Removed 200+ lines of slider logic
2. **Faster** - No real-time recalculation
3. **Consistent** - Fixed defaults = consistent output
4. **Batch Optimized** - Focus on generating many images quickly
5. **Figma Ready** - Do your custom tweaks in Figma, not sliders

## Technical Details

- Canvas: 698x882px (internal)
- Output: 1080x1350px (Instagram)
- All dimensions scale via percentages
- Black & white backgrounds with contrast adjustment
- Film grain overlay at 15% opacity
- Cream text (#F4EFE4) on dark backgrounds
- Centered layout with cross icon at top

---

Made with ✝️ for The Daily Saint
