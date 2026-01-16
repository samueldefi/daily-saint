"""
The Daily Saint - Quote Image Generator
Streamlit app for generating Instagram-ready saint quote images.
"""

import streamlit as st
from PIL import Image, ImageDraw, ImageFont
import cairosvg
import io
import json
import random
import os
from pathlib import Path
from datetime import datetime
import base64

# =============================================================================
# PAGE CONFIG
# =============================================================================

st.set_page_config(
    page_title="The Daily Saint",
    page_icon="✝️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# =============================================================================
# CONFIGURATION
# =============================================================================

CONFIG = {
    "output_width": 1080,
    "output_height": 1350,
    "text_color": "#FFF4EF",
    "overlay_1_color": (39, 37, 36),
    "overlay_1_opacity": 0.5,
    "overlay_2_color": (0, 0, 0),
    "overlay_2_opacity": 0.2,
    "quote_font_size": 72,
    "attribution_font_size": 36,
}

# =============================================================================
# INITIALIZE SESSION STATE
# =============================================================================

if 'image_library' not in st.session_state:
    st.session_state.image_library = {}  # {filename: bytes}

if 'quotes_data' not in st.session_state:
    st.session_state.quotes_data = None

if 'selected_quote' not in st.session_state:
    st.session_state.selected_quote = None

if 'generated_image' not in st.session_state:
    st.session_state.generated_image = None

if 'generation_count' not in st.session_state:
    st.session_state.generation_count = 0

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def load_svg_as_image(svg_bytes, scale=3):
    """Load SVG from bytes and convert to PIL Image."""
    png_data = cairosvg.svg2png(bytestring=svg_bytes, scale=scale)
    return Image.open(io.BytesIO(png_data)).convert("RGBA")


def apply_overlay(image, color, opacity):
    overlay = Image.new('RGBA', image.size, (*color, int(255 * opacity)))
    return Image.alpha_composite(image.convert('RGBA'), overlay)


def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        width = bbox[2] - bbox[0]
        
        if width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
    
    if current_line:
        lines.append(' '.join(current_line))
    
    return lines


def generate_image(
    quote: str,
    saint_name: str,
    background_bytes: bytes,
    icon_bytes: bytes,
    bold_font_bytes: bytes,
    light_font_bytes: bytes,
    config: dict = CONFIG
) -> Image.Image:
    """Generate a saint quote image."""
    
    # Load background
    bg = Image.open(io.BytesIO(background_bytes)).convert('RGBA')
    
    # Crop to 4:5 aspect ratio
    target_ratio = config['output_width'] / config['output_height']
    current_ratio = bg.width / bg.height
    
    if current_ratio > target_ratio:
        new_width = int(bg.height * target_ratio)
        left = (bg.width - new_width) // 2
        bg = bg.crop((left, 0, left + new_width, bg.height))
    else:
        new_height = int(bg.width / target_ratio)
        top = (bg.height - new_height) // 2
        bg = bg.crop((0, top, bg.width, top + new_height))
    
    bg = bg.resize((config['output_width'], config['output_height']), Image.Resampling.LANCZOS)
    
    # Apply overlays
    bg = apply_overlay(bg, config['overlay_1_color'], config['overlay_1_opacity'])
    bg = apply_overlay(bg, config['overlay_2_color'], config['overlay_2_opacity'])
    
    draw = ImageDraw.Draw(bg)
    
    # Load fonts from bytes
    quote_font = ImageFont.truetype(io.BytesIO(bold_font_bytes), config['quote_font_size'])
    attribution_font = ImageFont.truetype(io.BytesIO(light_font_bytes), config['attribution_font_size'])
    
    # Place icon
    icon = load_svg_as_image(icon_bytes, scale=3)
    icon_x = (config['output_width'] - icon.width) // 2
    bg.paste(icon, (icon_x, 80), icon)
    
    # Draw quote (Bold font)
    max_text_width = config['output_width'] - 160
    lines = wrap_text(quote, quote_font, max_text_width, draw)
    
    line_height = config['quote_font_size'] + 16
    total_text_height = len(lines) * line_height
    quote_y = (config['output_height'] - total_text_height) // 2 - 50
    
    text_color = hex_to_rgb(config['text_color'])
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=quote_font)
        text_width = bbox[2] - bbox[0]
        x = (config['output_width'] - text_width) // 2
        y = quote_y + (i * line_height)
        draw.text((x, y), line, font=quote_font, fill=text_color)
    
    # Draw attribution (Light font)
    attr_bbox = draw.textbbox((0, 0), saint_name, font=attribution_font)
    attr_width = attr_bbox[2] - attr_bbox[0]
    attr_x = (config['output_width'] - attr_width) // 2
    attr_y = config['output_height'] - 120
    draw.text((attr_x, attr_y), saint_name, font=attribution_font, fill=text_color)
    
    return bg.convert('RGB')


def get_image_download_link(img: Image.Image, filename: str) -> str:
    """Generate a download link for the image."""
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=95)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f'<a href="data:image/jpeg;base64,{img_str}" download="{filename}" class="download-btn">📥 Download Image</a>'


# =============================================================================
# SIDEBAR - File Uploads
# =============================================================================

with st.sidebar:
    st.header("⚙️ Setup")
    
    # Quotes database
    st.subheader("📜 Quotes Database")
    quotes_file = st.file_uploader(
        "Upload saints-quotes.json",
        type=['json'],
        key="quotes_upload"
    )
    
    if quotes_file:
        st.session_state.quotes_data = json.load(quotes_file)
        st.success(f"✓ Loaded {len(st.session_state.quotes_data['quotes'])} quotes")
    
    st.divider()
    
    # Font files
    st.subheader("🔤 Fonts")
    
    bold_font_file = st.file_uploader(
        "Bold font (for quotes)",
        type=['ttf', 'otf'],
        key="bold_font"
    )
    
    light_font_file = st.file_uploader(
        "Light font (for attribution)",
        type=['ttf', 'otf'],
        key="light_font"
    )
    
    st.divider()
    
    # Icon
    st.subheader("✝️ Icon")
    icon_file = st.file_uploader(
        "Cross icon (SVG)",
        type=['svg'],
        key="icon"
    )
    
    st.divider()
    
    # Image library
    st.subheader("🖼️ Image Library")
    
    uploaded_images = st.file_uploader(
        "Add background images",
        type=['jpg', 'jpeg', 'png'],
        accept_multiple_files=True,
        key="images"
    )
    
    if uploaded_images:
        for img_file in uploaded_images:
            if img_file.name not in st.session_state.image_library:
                st.session_state.image_library[img_file.name] = img_file.read()
        st.success(f"✓ {len(st.session_state.image_library)} images in library")
    
    # Show library contents
    if st.session_state.image_library:
        with st.expander(f"📁 Library ({len(st.session_state.image_library)} images)"):
            for name in st.session_state.image_library.keys():
                col1, col2 = st.columns([3, 1])
                col1.write(f"• {name[:25]}...")
                if col2.button("🗑️", key=f"del_{name}"):
                    del st.session_state.image_library[name]
                    st.rerun()
    
    st.divider()
    
    # Settings
    st.subheader("⚡ Settings")
    
    CONFIG['quote_font_size'] = st.slider(
        "Quote font size",
        min_value=48,
        max_value=96,
        value=72
    )
    
    CONFIG['attribution_font_size'] = st.slider(
        "Attribution font size",
        min_value=24,
        max_value=48,
        value=36
    )


# =============================================================================
# MAIN CONTENT
# =============================================================================

st.title("✝️ The Daily Saint")
st.caption("Generate Instagram-ready saint quote images")

# Check if we have required files
missing = []
if not st.session_state.quotes_data:
    missing.append("quotes database")
if not bold_font_file:
    missing.append("bold font")
if not light_font_file:
    missing.append("light font")
if not icon_file:
    missing.append("icon")
if not st.session_state.image_library:
    missing.append("background images")

if missing:
    st.warning(f"⚠️ Please upload: {', '.join(missing)}")
    st.stop()

# =============================================================================
# QUOTE SELECTION
# =============================================================================

st.header("1️⃣ Select Quote")

quotes = st.session_state.quotes_data['quotes']

# Group quotes by saint
saints = {}
for q in quotes:
    saint = q['saint']
    if saint not in saints:
        saints[saint] = []
    saints[saint].append(q)

col1, col2 = st.columns(2)

with col1:
    # Filter by feast day
    today = datetime.now().strftime("%m-%d")
    feast_days = sorted(set(q['feastDay'] for q in quotes))
    
    selected_date = st.selectbox(
        "Filter by feast day",
        options=["All dates", f"Today ({today})"] + feast_days,
        index=0
    )

with col2:
    # Filter by saint
    saint_names = sorted(saints.keys())
    selected_saint = st.selectbox(
        "Filter by saint",
        options=["All saints"] + saint_names,
        index=0
    )

# Filter quotes
filtered_quotes = quotes.copy()

if selected_date == f"Today ({today})":
    filtered_quotes = [q for q in filtered_quotes if q['feastDay'] == today]
elif selected_date != "All dates":
    filtered_quotes = [q for q in filtered_quotes if q['feastDay'] == selected_date]

if selected_saint != "All saints":
    filtered_quotes = [q for q in filtered_quotes if q['saint'] == selected_saint]

if not filtered_quotes:
    st.warning("No quotes match your filters")
    st.stop()

# Quote selector
quote_options = [f"{q['saint']}: \"{q['text'][:50]}...\"" for q in filtered_quotes]

selected_index = st.selectbox(
    "Choose a quote",
    options=range(len(filtered_quotes)),
    format_func=lambda x: quote_options[x]
)

selected_quote = filtered_quotes[selected_index]

# Display selected quote
st.info(f"**{selected_quote['saint']}** (Feast: {selected_quote['feastDay']})\n\n\"{selected_quote['text']}\"")

# =============================================================================
# IMAGE SELECTION
# =============================================================================

st.header("2️⃣ Select Background")

col1, col2 = st.columns([2, 1])

with col1:
    image_names = list(st.session_state.image_library.keys())
    
    selection_mode = st.radio(
        "Selection mode",
        options=["🎲 Random", "📋 Choose specific"],
        horizontal=True
    )
    
    if selection_mode == "📋 Choose specific":
        selected_image_name = st.selectbox(
            "Choose background",
            options=image_names
        )
    else:
        # Random selection
        if st.button("🔀 Shuffle Background"):
            st.session_state.generation_count += 1
        
        # Use generation count as seed for consistent randomness per click
        random.seed(st.session_state.generation_count)
        selected_image_name = random.choice(image_names)
        st.write(f"Selected: **{selected_image_name}**")

with col2:
    # Preview selected image
    if selected_image_name:
        preview_img = Image.open(io.BytesIO(st.session_state.image_library[selected_image_name]))
        preview_img.thumbnail((300, 300))
        st.image(preview_img, caption="Background preview")

# =============================================================================
# GENERATE IMAGE
# =============================================================================

st.header("3️⃣ Generate")

col1, col2, col3 = st.columns([1, 1, 1])

with col2:
    generate_btn = st.button(
        "✨ Generate Image",
        type="primary",
        use_container_width=True
    )

if generate_btn:
    with st.spinner("Generating..."):
        # Read font and icon bytes
        bold_font_file.seek(0)
        light_font_file.seek(0)
        icon_file.seek(0)
        
        bold_font_bytes = bold_font_file.read()
        light_font_bytes = light_font_file.read()
        icon_bytes = icon_file.read()
        
        # Generate
        generated = generate_image(
            quote=selected_quote['text'],
            saint_name=selected_quote['saint'],
            background_bytes=st.session_state.image_library[selected_image_name],
            icon_bytes=icon_bytes,
            bold_font_bytes=bold_font_bytes,
            light_font_bytes=light_font_bytes,
            config=CONFIG
        )
        
        st.session_state.generated_image = generated

# Display generated image
if st.session_state.generated_image:
    st.divider()
    
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.image(st.session_state.generated_image, use_container_width=True)
        
        # Download button
        img_buffer = io.BytesIO()
        st.session_state.generated_image.save(img_buffer, format="JPEG", quality=95)
        
        filename = f"{selected_quote['saint'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        
        st.download_button(
            label="📥 Download Image",
            data=img_buffer.getvalue(),
            file_name=filename,
            mime="image/jpeg",
            use_container_width=True
        )
    
    # Regenerate hint
    st.caption("💡 Click 'Generate Image' again to try a different layout, or shuffle the background for variety.")

# =============================================================================
# FOOTER
# =============================================================================

st.divider()
st.caption("Made with ✝️ for The Daily Saint")
