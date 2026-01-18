"""
The Daily Saint - Quote Image Generator
Batch generates Instagram-ready saint quote images.
"""

import streamlit as st
from PIL import Image, ImageDraw, ImageFont, ImageOps
import cairosvg
import io
import json
import random
import zipfile
import numpy as np
from datetime import datetime

# =============================================================================
# PAGE CONFIG
# =============================================================================

st.set_page_config(
    page_title="The Daily Saint",
    page_icon="✝️",
    layout="centered"
)

# =============================================================================
# EMBEDDED ASSETS
# =============================================================================

ICON_SVG = '''<svg width="21" height="28" viewBox="0 0 21 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.23137 11.698V12.0059C1.23137 12.6859 1.78272 13.2373 2.46274 13.2373C3.14277 13.2373 3.69412 12.6859 3.69412 12.0059V11.698H9.23529V24.0118H8.92745C8.24742 24.0118 7.69608 24.5631 7.69608 25.2431C7.69608 25.9232 8.24742 26.4745 8.92745 26.4745H9.23529C9.23529 27.1545 9.78664 27.7059 10.4667 27.7059C11.1467 27.7059 11.698 27.1545 11.698 26.4745H12.0059C12.6859 26.4745 13.2373 25.9232 13.2373 25.2431C13.2373 24.5631 12.6859 24.0118 12.0059 24.0118H11.698V11.698H17.2392V12.0059C17.2392 12.6859 17.7906 13.2373 18.4706 13.2373C19.1506 13.2373 19.702 12.6859 19.702 12.0059V11.698C20.382 11.698 20.9333 11.1467 20.9333 10.4667C20.9333 9.78664 20.382 9.23529 19.702 9.23529V8.92745C19.702 8.24743 19.1506 7.69608 18.4706 7.69608C17.7906 7.69608 17.2392 8.24743 17.2392 8.92745V9.23529H11.698V3.69412H12.0059C12.6859 3.69412 13.2373 3.14277 13.2373 2.46275C13.2373 1.78272 12.6859 1.23137 12.0059 1.23137H11.698C11.698 0.551347 11.1467 0 10.4667 0C9.78664 0 9.23529 0.551347 9.23529 1.23137H8.92745C8.24742 1.23137 7.69608 1.78272 7.69608 2.46275C7.69608 3.14277 8.24742 3.69412 8.92745 3.69412H9.23529V9.23529H3.69412V8.92745C3.69412 8.24743 3.14277 7.69608 2.46274 7.69608C1.78272 7.69608 1.23137 8.24743 1.23137 8.92745V9.23529C0.551347 9.23529 0 9.78664 0 10.4667C0 11.1467 0.551347 11.698 1.23137 11.698Z" fill="white"/>
</svg>'''

# =============================================================================
# FIXED CONFIGURATION
# =============================================================================

CONFIG = {
    "output_width": 1080,
    "output_height": 1350,
    "text_color": "#FFF4EF",
    "overlay_1_color": (39, 37, 36),
    "overlay_1_opacity": 0.5,
    "overlay_2_color": (0, 0, 0),
    "overlay_2_opacity": 0.2,
    "quote_font_percent": 0.06,
    "attribution_font_percent": 0.0315,
    "margin_lr_percent": 0.242,
    "margin_top": 0.054,
    "icon_scale": 2.55,
    "line_spacing": 1.2,
}

# =============================================================================
# SESSION STATE
# =============================================================================

if 'generated_images' not in st.session_state:
    st.session_state.generated_images = []

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def load_svg_as_image(svg_string, scale=3):
    """Load SVG from string and convert to PIL Image."""
    png_data = cairosvg.svg2png(bytestring=svg_string.encode(), scale=scale)
    return Image.open(io.BytesIO(png_data)).convert("RGBA")


def apply_overlay(image, color, opacity):
    overlay = Image.new('RGBA', image.size, (*color, int(255 * opacity)))
    return Image.alpha_composite(image.convert('RGBA'), overlay)


def soft_light_blend(base, blend, intensity=0.5):
    """Apply soft light blending mode for film grain effect."""
    base_arr = np.array(base).astype(float) / 255.0
    blend_arr = np.array(blend.convert('L')).astype(float) / 255.0
    
    blend_arr = 0.5 + (blend_arr - blend_arr.mean()) * intensity
    blend_arr = np.clip(blend_arr, 0, 1)
    
    result = np.zeros_like(base_arr)
    
    for c in range(min(3, base_arr.shape[2])):
        b = base_arr[:,:,c]
        mask = blend_arr < 0.5
        
        result[:,:,c] = np.where(
            mask,
            2 * b * blend_arr + b * b * (1 - 2 * blend_arr),
            2 * b * (1 - blend_arr) + np.sqrt(np.clip(b, 0.0001, 1)) * (2 * blend_arr - 1)
        )
    
    if base_arr.shape[2] == 4:
        result[:,:,3] = base_arr[:,:,3]
    
    result = np.clip(result * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(result, mode=base.mode)


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


def sanitize_filename(name):
    """Convert saint name to safe filename."""
    return name.replace(' ', '_').replace('.', '').replace(',', '').replace("'", '')


def generate_image(
    quote: str,
    saint_name: str,
    background_bytes: bytes = None,
    solid_color: str = None,
    grayscale: bool = True,
    bold_font_bytes: bytes = None,
    light_font_bytes: bytes = None,
    grain_bytes: bytes = None,
    grain_intensity: float = 0.5
) -> Image.Image:
    """Generate a saint quote image."""
    
    width = CONFIG['output_width']
    height = CONFIG['output_height']
    
    quote_font_size = int(width * CONFIG['quote_font_percent'])
    attribution_font_size = int(width * CONFIG['attribution_font_percent'])
    margin_lr = int(width * CONFIG['margin_lr_percent'])
    margin_top = int(height * CONFIG['margin_top'])
    icon_scale = CONFIG['icon_scale']
    
    # Create background
    if solid_color:
        bg = Image.new('RGBA', (width, height), hex_to_rgb(solid_color) + (255,))
    else:
        bg = Image.open(io.BytesIO(background_bytes)).convert('RGBA')
        
        # Crop to 4:5 aspect ratio
        target_ratio = width / height
        current_ratio = bg.width / bg.height
        
        if current_ratio > target_ratio:
            new_width = int(bg.height * target_ratio)
            left = (bg.width - new_width) // 2
            bg = bg.crop((left, 0, left + new_width, bg.height))
        else:
            new_height = int(bg.width / target_ratio)
            top = (bg.height - new_height) // 2
            bg = bg.crop((0, top, bg.width, top + new_height))
        
        bg = bg.resize((width, height), Image.Resampling.LANCZOS)
        
        if grayscale:
            bg = ImageOps.grayscale(bg).convert('RGBA')
        
        bg = apply_overlay(bg, CONFIG['overlay_1_color'], CONFIG['overlay_1_opacity'])
        bg = apply_overlay(bg, CONFIG['overlay_2_color'], CONFIG['overlay_2_opacity'])
    
    # Apply grain texture
    if grain_bytes:
        grain = Image.open(io.BytesIO(grain_bytes))
        grain_resized = grain.resize((width, height), Image.Resampling.LANCZOS)
        bg = soft_light_blend(bg, grain_resized, intensity=grain_intensity)
    
    draw = ImageDraw.Draw(bg)
    
    # Load fonts
    quote_font = ImageFont.truetype(io.BytesIO(bold_font_bytes), quote_font_size)
    attribution_font = ImageFont.truetype(io.BytesIO(light_font_bytes), attribution_font_size)
    
    # Place icon
    icon = load_svg_as_image(ICON_SVG, scale=icon_scale)
    icon_x = (width - icon.width) // 2
    icon_y = margin_top
    bg.paste(icon, (icon_x, icon_y), icon)
    
    # Calculate attribution position
    attr_bbox = draw.textbbox((0, 0), saint_name, font=attribution_font)
    attr_height = attr_bbox[3] - attr_bbox[1]
    attr_y = height - margin_top - attr_height
    
    # Calculate text area
    max_text_width = width - (margin_lr * 2)
    
    # Wrap and draw quote
    lines = wrap_text(quote, quote_font, max_text_width, draw)
    
    line_height = int(quote_font_size * CONFIG['line_spacing'])
    total_text_height = len(lines) * line_height
    
    # Center quote between icon and attribution
    icon_bottom = icon_y + icon.height
    available_space = attr_y - icon_bottom
    quote_y = icon_bottom + (available_space - total_text_height) // 2
    
    text_color = hex_to_rgb(CONFIG['text_color'])
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=quote_font)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        y = quote_y + (i * line_height)
        draw.text((x, y), line, font=quote_font, fill=text_color)
    
    # Draw attribution
    attr_width = attr_bbox[2] - attr_bbox[0]
    attr_x = (width - attr_width) // 2
    draw.text((attr_x, attr_y), saint_name, font=attribution_font, fill=text_color)
    
    return bg.convert('RGB')


def create_zip(images_data):
    """Create a ZIP file from list of (filename, image) tuples."""
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for filename, img in images_data:
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='JPEG', quality=95)
            zf.writestr(filename, img_buffer.getvalue())
    
    zip_buffer.seek(0)
    return zip_buffer


# =============================================================================
# MAIN APP
# =============================================================================

st.title("✝️ The Daily Saint")
st.caption("Batch generate Instagram-ready saint quote images")

st.divider()

# -----------------------------------------------------------------------------
# FILE UPLOADS
# -----------------------------------------------------------------------------

st.subheader("📁 Upload Files")

quotes_file = st.file_uploader("Quotes JSON", type=['json'], help="JSON file with quotes array")

images_files = st.file_uploader(
    "Background Images", 
    type=['jpg', 'jpeg', 'png'], 
    accept_multiple_files=True,
    help="Upload multiple images for random pairing"
)

col1, col2 = st.columns(2)
with col1:
    bold_font_file = st.file_uploader("Bold Font (quotes)", type=['ttf', 'otf'])
with col2:
    light_font_file = st.file_uploader("Light Font (attribution)", type=['ttf', 'otf'])

grain_file = st.file_uploader("Film Grain (optional)", type=['png', 'jpg'], help="Optional texture overlay")

st.divider()

# -----------------------------------------------------------------------------
# OPTIONS
# -----------------------------------------------------------------------------

st.subheader("⚙️ Options")

col1, col2 = st.columns(2)

with col1:
    use_grayscale = st.checkbox("Black & white backgrounds", value=True)

with col2:
    use_solid_color = st.checkbox("Use solid color instead", value=False)

if use_solid_color:
    solid_color = st.color_picker("Background color", value="#1a1a1a")
else:
    solid_color = None

# Grain intensity slider (only show if grain uploaded)
grain_intensity = 0.5
if grain_file:
    grain_intensity = st.slider(
        "Grain intensity",
        min_value=0.1, 
        max_value=1.0,
        value=0.5, 
        step=0.1,
        help="0.5 = subtle, 1.0 = strong"
    )

st.divider()

# -----------------------------------------------------------------------------
# STATUS CHECK
# -----------------------------------------------------------------------------

quotes_ready = quotes_file is not None
images_ready = len(images_files) > 0 if images_files else False
fonts_ready = bold_font_file is not None and light_font_file is not None

# Load quotes
quotes = []
if quotes_ready:
    try:
        quotes_file.seek(0)
        quotes_data = json.load(quotes_file)
        quotes = quotes_data.get('quotes', [])
    except json.JSONDecodeError:
        st.error("❌ Invalid JSON file")
        st.stop()

# Status
if quotes_ready and (images_ready or use_solid_color) and fonts_ready:
    if use_solid_color:
        st.success(f"✅ Ready: {len(quotes)} quotes • Solid color mode")
    else:
        st.success(f"✅ Ready: {len(quotes)} quotes • {len(images_files)} backgrounds")
else:
    missing = []
    if not quotes_ready:
        missing.append("quotes JSON")
    if not images_ready and not use_solid_color:
        missing.append("background images")
    if not fonts_ready:
        missing.append("fonts (both)")
    st.warning(f"⚠️ Missing: {', '.join(missing)}")
    st.stop()

# -----------------------------------------------------------------------------
# GENERATE
# -----------------------------------------------------------------------------

if st.button("✨ Generate All Images", type="primary"):
    
    # Read fonts
    bold_font_file.seek(0)
    light_font_file.seek(0)
    bold_bytes = bold_font_file.read()
    light_bytes = light_font_file.read()
    
    # Read grain
    grain_bytes = None
    if grain_file:
        grain_file.seek(0)
        grain_bytes = grain_file.read()
    
    # Read images
    image_bytes_list = []
    if not use_solid_color:
        for img_file in images_files:
            img_file.seek(0)
            image_bytes_list.append(img_file.read())
    
    # Generate
    generated = []
    progress = st.progress(0, text="Generating...")
    
    for i, quote_data in enumerate(quotes):
        quote_text = quote_data.get('text', '')
        saint_name = quote_data.get('saint', 'Unknown Saint')
        
        if use_solid_color:
            bg_bytes = None
        else:
            bg_bytes = random.choice(image_bytes_list)
        
        try:
            img = generate_image(
                quote=quote_text,
                saint_name=saint_name,
                background_bytes=bg_bytes,
                solid_color=solid_color if use_solid_color else None,
                grayscale=use_grayscale,
                bold_font_bytes=bold_bytes,
                light_font_bytes=light_bytes,
                grain_bytes=grain_bytes,
                grain_intensity=grain_intensity
            )
            
            safe_name = sanitize_filename(saint_name)
            filename = f"{safe_name}_{i+1:03d}.jpg"
            generated.append((filename, img))
            
        except Exception as e:
            st.error(f"Error generating image {i+1}: {str(e)}")
            continue
        
        progress.progress((i + 1) / len(quotes), text=f"Generated {i + 1}/{len(quotes)}")
    
    st.session_state.generated_images = generated
    progress.empty()
    
    if generated:
        st.success(f"✅ Generated {len(generated)} images!")

# -----------------------------------------------------------------------------
# DOWNLOAD & PREVIEW
# -----------------------------------------------------------------------------

if st.session_state.generated_images:
    st.divider()
    
    # Download button
    zip_data = create_zip(st.session_state.generated_images)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    st.download_button(
        label=f"📥 Download ZIP ({len(st.session_state.generated_images)} images)",
        data=zip_data,
        file_name=f"daily_saint_{timestamp}.zip",
        mime="application/zip"
    )
    
    # Preview
    st.subheader("👁️ Preview")
    
    preview_count = min(6, len(st.session_state.generated_images))
    cols = st.columns(3)
    
    for i, (filename, img) in enumerate(st.session_state.generated_images[:preview_count]):
        with cols[i % 3]:
            st.image(img, caption=filename)

# -----------------------------------------------------------------------------
# FOOTER
# -----------------------------------------------------------------------------

st.divider()
st.caption("Made for The Daily Saint • Click generate again for new random pairings")
