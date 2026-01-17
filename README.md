# The Daily Saint - Image Generator

Batch generate Instagram-ready saint quote images (1080x1350).

## Features

- **Batch generation** — all quotes generated at once
- **Random image pairing** — each quote gets a random background
- **B&W mode** — grayscale backgrounds (default ON)
- **Solid color mode** — flat color backgrounds with picker
- **Film grain** — optional texture overlay with intensity control
- **ZIP download** — all images in one download

## Files for GitHub

```
streamlit_app.py    # Main application
requirements.txt    # Python dependencies
packages.txt        # System dependencies (for Cairo)
README.md           # This file
```

## Deploy to Streamlit Cloud

1. Create a GitHub repo and upload all files
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Sign in with GitHub
4. New app → select your repo
5. Main file: `streamlit_app.py`
6. Deploy

## Usage

### Upload:
1. **Quotes JSON** — your quotes file
2. **Background images** — multiple images for variety
3. **Fonts** — Bold (quotes) + Light (attribution) TTF files
4. **Film grain** (optional) — texture overlay

### Options:
- **B&W backgrounds** — converts images to grayscale
- **Solid color** — use flat color instead of images
- **Grain intensity** — 0.1 (subtle) to 1.0 (strong)

### Generate:
1. Click **Generate All Images**
2. Wait for progress bar
3. Click **Download ZIP**

## Quotes JSON Format

```json
{
  "quotes": [
    {
      "text": "Be who God meant you to be and you will set the world on fire.",
      "saint": "St. Catherine of Siena",
      "feastDay": "04-29"
    }
  ]
}
```

## Output

- Format: JPEG (95% quality)
- Size: 1080 x 1350 pixels (4:5 Instagram)
- Filename: `{Saint_Name}_{number}.jpg`
