# The Daily Saint - Image Generator v2

Batch generate saint quote images.

## Features

-  **One-click batch generation** — all quotes generated at once
-  **Random image pairing** — each quote gets a random background
-  **B&W mode** — grayscale backgrounds for brand consistency (default ON)
-  **Solid color mode** — flat color backgrounds with color picker
-  **Proper margins** — text stays away from edges
-  **Smart filenames** — saint name in every file for easy searching
-  **ZIP download** — all images in one download

## Deploy to Streamlit Cloud

### 1. Create GitHub Repo
- Go to [github.com/new](https://github.com/new)
- Name: `daily-saint-generator`
- Private repo recommended
- Create

### 2. Upload These Files
```
streamlit_app.py
requirements.txt
packages.txt
```

### 3. Deploy
- Go to [share.streamlit.io](https://share.streamlit.io)
- Sign in with GitHub
- New app → select your repo
- Main file: `streamlit_app.py`
- Deploy

## Using the App

### Each Session, Upload:
1. **Quotes JSON** — your saints-quotes.json
2. **Background images** — drag & drop multiple
3. **Fonts** (in expander) — Bold + Light TTF files

### Settings:
- **B&W backgrounds** — ON by default, toggle OFF for color
- **Solid color** — toggle ON to use flat color instead of images

### Generate:
1. Click **GENERATE ALL**
2. Wait for progress bar
3. Click **Download ZIP**

### Want Different Pairings?
Just click GENERATE ALL again — images are randomly assigned each time.

## File Naming

Output files are named: `{Saint_Name}_{number}.jpg`

Examples:
- `St_Catherine_of_Siena_001.jpg`
- `St_Francis_de_Sales_002.jpg`
- `Mary_Mother_of_God_003.jpg`

## Quotes JSON Format

```json
{
  "quotes": [
    {
      "text": "Be who God meant you to be...",
      "saint": "St. Catherine of Siena",
      "feastDay": "04-29"
    }
  ]
}
```

## Tips

- Upload more images than quotes for better variety
- Re-generate multiple times to find good pairings
- Use B&W mode for consistent branding
- Solid color mode is great for variety in your feed
