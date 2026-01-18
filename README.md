# The Daily Saint - Image Generator

Batch generate Instagram-ready saint quote images (1080x1350).

## Features

- Batch generation — all quotes at once
- Random image pairing
- B&W mode (default ON)
- Solid color backgrounds
- Film grain with intensity control
- ZIP download

## Files

```
streamlit_app.py    # Main application
requirements.txt    # Python dependencies  
packages.txt        # System dependencies
README.md           # This file
```

## Deploy to Streamlit Cloud

1. Create GitHub repo, upload all 4 files
2. Go to share.streamlit.io
3. New app → select repo → Deploy

## Quotes JSON Format

```json
{
  "quotes": [
    {
      "text": "Quote text here",
      "saint": "St. Name Here"
    }
  ]
}
```
