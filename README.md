# The Daily Saint - Streamlit App

Generate Instagram-ready saint quote images with a simple web interface.

## Features

- 📜 Load your quotes database (JSON)
- 🖼️ Upload multiple background images (persistent library)
- 🎲 Random or manual image selection
- ✨ One-click image generation
- 📥 Direct download
- 🔄 Regenerate for variations

## Deploy to Streamlit Cloud

### Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `daily-saint-generator` (or whatever you like)
3. Make it **Private** (recommended)
4. Click "Create repository"

### Step 2: Upload Files

Upload these files to your repo:
```
daily-saint-generator/
├── streamlit_app.py      # Main app
├── requirements.txt      # Python dependencies
└── packages.txt          # System dependencies (for cairosvg)
```

You can drag and drop files directly on GitHub, or use git:
```bash
git clone https://github.com/YOUR_USERNAME/daily-saint-generator.git
cd daily-saint-generator
# copy files here
git add .
git commit -m "Initial commit"
git push
```

### Step 3: Deploy on Streamlit Cloud

1. Go to [share.streamlit.io](https://share.streamlit.io)
2. Sign in with GitHub
3. Click "New app"
4. Select your repository: `daily-saint-generator`
5. Branch: `main`
6. Main file path: `streamlit_app.py`
7. Click "Deploy"

Wait 2-3 minutes for deployment. You'll get a URL like:
`https://your-app-name.streamlit.app`

## Using the App

### First Time Setup

1. **Upload Quotes Database**
   - Upload your `saints-quotes.json` file
   
2. **Upload Fonts**
   - Bold font: `RhymesVFIBoldTrialUnlicensed-Bold.ttf`
   - Light font: `RhymesVFILight-Light.ttf`

3. **Upload Icon**
   - Your cross icon: `saintscroll-icon.svg`

4. **Upload Background Images**
   - Drag and drop multiple images at once
   - They stay in your library for the session

### Generating Images

1. **Filter quotes** by date or saint
2. **Select a quote** from the dropdown
3. **Choose background** (random or specific)
4. **Click Generate**
5. **Download** the result

### Getting Variations

- Click "Generate" again → same quote, same image, regenerated
- Click "🔀 Shuffle Background" → picks new random image
- Change the quote → different content

## File Formats

### saints-quotes.json
```json
{
  "quotes": [
    {
      "text": "The quote text here",
      "saint": "St. Name Here",
      "feastDay": "01-17"
    }
  ]
}
```

### Background Images
- Formats: JPG, JPEG, PNG
- Recommended: 1080x1350 or larger
- Any aspect ratio works (auto-cropped to 4:5)

## Troubleshooting

**App won't deploy:**
- Make sure `packages.txt` is included (needed for cairosvg)

**Fonts not loading:**
- Re-upload the font files
- Make sure they're .ttf or .otf format

**Images look wrong:**
- Check image dimensions (should be reasonably large)
- Try a different background image

## Local Development

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Opens at `http://localhost:8501`
