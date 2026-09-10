# The Daily Saint

Next.js studio that batch-generates Instagram saint quote images at 1080×1350.

The Streamlit app stays in this repo. This branch rebuilds the same generator as a browser studio.

## Features

- Batch generation for every quote in a JSON file
- Random background pairing
- Black and white mode (on by default)
- Solid color backgrounds
- Film grain with intensity control
- ZIP download of JPEG files

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Quotes JSON

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

A sample file is in `public/samples/quotes.json`. The studio also has a **Load sample quotes** control.

Fonts are optional. The studio ships Cormorant Garamond for quotes and attribution. Upload `.ttf` or `.otf` files to replace them.

## Deploy

Push this branch and deploy on Vercel. The app runs in the browser. It does not need Python.

## Streamlit

The original files remain:

- `streamlit_app.py`
- `streamlit_app(3).py`
- `requirements.txt`
- `packages.txt`
