"""
The Daily Saint - Quote Image Generator v2
Batch generates Instagram-ready saint quote images.
"""

import streamlit as st
from PIL import Image, ImageDraw, ImageFont, ImageOps
import cairosvg
import io
import json
import random
import base64
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
# EMBEDDED ASSETS (Base64 encoded)
# =============================================================================

# Cross icon SVG
ICON_SVG = '''<svg width="21" height="28" viewBox="0 0 21 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.23137 11.698V12.0059C1.23137 12.6859 1.78272 13.2373 2.46274 13.2373C3.14277 13.2373 3.69412 12.6859 3.69412 12.0059V11.698H9.23529V24.0118H8.92745C8.24742 24.0118 7.69608 24.5631 7.69608 25.2431C7.69608 25.9232 8.24742 26.4745 8.92745 26.4745H9.23529C9.23529 27.1545 9.78664 27.7059 10.4667 27.7059C11.1467 27.7059 11.698 27.1545 11.698 26.4745H12.0059C12.6859 26.4745 13.2373 25.9232 13.2373 25.2431C13.2373 24.5631 12.6859 24.0118 12.0059 24.0118H11.698V11.698H17.2392V12.0059C17.2392 12.6859 17.7906 13.2373 18.4706 13.2373C19.1506 13.2373 19.702 12.6859 19.702 12.0059V11.698C20.382 11.698 20.9333 11.1467 20.9333 10.4667C20.9333 9.78664 20.382 9.23529 19.702 9.23529V8.92745C19.702 8.24743 19.1506 7.69608 18.4706 7.69608C17.7906 7.69608 17.2392 8.24743 17.2392 8.92745V9.23529H11.698V3.69412H12.0059C12.6859 3.69412 13.2373 3.14277 13.2373 2.46275C13.2373 1.78272 12.6859 1.23137 12.0059 1.23137H11.698C11.698 0.551347 11.1467 0 10.4667 0C9.78664 0 9.23529 0.551347 9.23529 1.23137H8.92745C8.24742 1.23137 7.69608 1.78272 7.69608 2.46275C7.69608 3.14277 8.24742 3.69412 8.92745 3.69412H9.23529V9.23529H3.69412V8.92745C3.69412 8.24743 3.14277 7.69608 2.46274 7.69608C1.78272 7.69608 1.23137 8.24743 1.23137 8.92745V9.23529C0.551347 9.23529 0 9.78664 0 10.4667C0 11.1467 0.551347 11.698 1.23137 11.698Z" fill="white"/>
</svg>'''

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
    # Percentages based on Figma (698x882): 42px font, 169px margin, 22px attribution
    "quote_font_percent": 0.06,        # 6% of width = 65px at 1080
    "attribution_font_percent": 0.0315, # 3.15% of width = 34px at 1080
    "margin_lr_percent": 0.242,         # 24.2% each side = 261px at 1080
    "margin_top": 0.054,                # 5.4% of height for top
    "icon_scale": 2.55,                 # 15% smaller than previous 3.0
    "line_spacing": 1.2,                # 120% line spacing
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
    
    # Normalize blend around 0.5 (neutral gray) with intensity control
    blend_arr = 0.5 + (blend_arr - blend_arr.mean()) * intensity
    blend_arr = np.clip(blend_arr, 0, 1)
    
    result = np.zeros_like(base_arr)
    
    for c in range(min(3, base_arr.shape[2])):  # RGB channels
        b = base_arr[:,:,c]
        mask = blend_arr < 0.5
        
        result[:,:,c] = np.where(
            mask,
            2 * b * blend_arr + b * b * (1 - 2 * blend_arr),
            2 * b * (1 - blend_arr) + np.sqrt(np.clip(b, 0.0001, 1)) * (2 * blend_arr - 1)
        )
    
    # Keep alpha channel from base if present
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
    grain_intensity: float = 0.5,
    config: dict = CONFIG
) -> Image.Image:
    """Generate a saint quote image."""
    
    width = config['output_width']
    height = config['output_height']
    
    # Calculate sizes from percentages
    quote_font_size = int(width * config['quote_font_percent'])
    attribution_font_size = int(width * config['attribution_font_percent'])
    margin_lr = int(width * config['margin_lr_percent'])
    margin_top = int(height * config['margin_top'])
    icon_scale = config['icon_scale']
    
    # Create background
    if solid_color:
        # Solid color background
        bg = Image.new('RGBA', (width, height), hex_to_rgb(solid_color) + (255,))
    else:
        # Image background
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
        
        # Convert to grayscale if enabled
        if grayscale:
            bg = ImageOps.grayscale(bg).convert('RGBA')
        
        # Apply overlays
        bg = apply_overlay(bg, config['overlay_1_color'], config['overlay_1_opacity'])
        bg = apply_overlay(bg, config['overlay_2_color'], config['overlay_2_opacity'])
    
    # Apply grain texture BEFORE text/icon (soft light blend)
    if grain_bytes:
        grain = Image.open(io.BytesIO(grain_bytes))
        grain_resized = grain.resize((width, height), Image.Resampling.LANCZOS)
        bg = soft_light_blend(bg, grain_resized, intensity=grain_intensity)
    
    draw = ImageDraw.Draw(bg)
    
    # Load fonts
    quote_font = ImageFont.truetype(io.BytesIO(bold_font_bytes), quote_font_size)
    attribution_font = ImageFont.truetype(io.BytesIO(light_font_bytes), attribution_font_size)
    
    # Place icon (scaled down 15%)
    icon = load_svg_as_image(ICON_SVG, scale=icon_scale)
    icon_x = (width - icon.width) // 2
    icon_y = margin_top
    bg.paste(icon, (icon_x, icon_y), icon)
    
    # Calculate attribution position first (we need this for centering)
    attr_bbox = draw.textbbox((0, 0), saint_name, font=attribution_font)
    attr_height = attr_bbox[3] - attr_bbox[1]
    attr_y = height - margin_top - attr_height  # Bottom margin
    
    # Calculate text area with percentage-based margins
    max_text_width = width - (margin_lr * 2)
    
    # Wrap and draw quote
    lines = wrap_text(quote, quote_font, max_text_width, draw)
    
    line_height = int(quote_font_size * config['line_spacing'])  # 120% line spacing default
    total_text_height = len(lines) * line_height
    
    # Center quote BETWEEN icon bottom and attribution top
    icon_bottom = icon_y + icon.height
    available_space = attr_y - icon_bottom
    quote_y = icon_bottom + (available_space - total_text_height) // 2
    
    text_color = hex_to_rgb(config['text_color'])
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

# -----------------------------------------------------------------------------
# FILE UPLOADS (compact row)
# -----------------------------------------------------------------------------

col1, col2 = st.columns(2)

with col1:
    quotes_file = st.file_uploader("📜 Quotes JSON", type=['json'], key="quotes")
    
with col2:
    images_files = st.file_uploader("🖼️ Background Images", type=['jpg', 'jpeg', 'png'], 
                                     accept_multiple_files=True, key="images")

# Font uploads (in expander to keep UI clean)
with st.expander("🔤 Fonts & Grain (upload once per session)"):
    fcol1, fcol2 = st.columns(2)
    with fcol1:
        bold_font_file = st.file_uploader("Bold font (quotes)", type=['ttf', 'otf'], key="bold")
    with fcol2:
        light_font_file = st.file_uploader("Light font (attribution)", type=['ttf', 'otf'], key="light")
    
    grain_file = st.file_uploader("🎞️ Film grain texture (optional)", type=['png', 'jpg'], key="grain")

# -----------------------------------------------------------------------------
# SETTINGS (compact)
# -----------------------------------------------------------------------------

with st.expander("⚙️ Settings", expanded=True):
    scol1, scol2 = st.columns(2)
    
    with scol1:
        use_grayscale = st.toggle("Black & White backgrounds", value=True)
    
    with scol2:
        use_solid_color = st.toggle("Use solid color instead", value=False)
    
    if use_solid_color:
        solid_color = st.color_picker("Background color", value="#1a1a1a")
    else:
        solid_color = None
    
    # Grain intensity (only show if grain uploaded)
    grain_intensity = 0.5  # default
    if grain_file:
        grain_intensity = st.slider(
            "🎞️ Grain intensity",
            min_value=0.1, max_value=1.0,
            value=0.5, step=0.1,
            help="0.5 = subtle, 1.0 = strong"
        )
    
    # Advanced settings
    with st.expander("🎛️ Fine-tune (optional)"):
        tcol1, tcol2 = st.columns(2)
        with tcol1:
            quote_font_pct = st.slider(
                "Quote font size %", 
                min_value=0.04, max_value=0.10, 
                value=0.06, step=0.005,
                help="6% = matches Figma"
            )
            margin_lr_pct = st.slider(
                "Side margins %",
                min_value=0.10, max_value=0.35,
                value=0.242, step=0.01,
                help="24.2% = matches Figma"
            )
            line_spacing_pct = st.slider(
                "Line spacing %",
                min_value=1.0, max_value=1.5,
                value=1.2, step=0.05,
                help="1.2 = 120% (matches Figma)"
            )
        with tcol2:
            attr_font_pct = st.slider(
                "Attribution font %",
                min_value=0.02, max_value=0.05,
                value=0.0315, step=0.005,
                help="3.15% = matches Figma"
            )
            icon_scale_val = st.slider(
                "Icon size",
                min_value=1.5, max_value=4.0,
                value=2.55, step=0.15,
                help="2.55 = matches Figma"
            )
        
        # Update config with slider values
        CONFIG['quote_font_percent'] = quote_font_pct
        CONFIG['attribution_font_percent'] = attr_font_pct
        CONFIG['margin_lr_percent'] = margin_lr_pct
        CONFIG['icon_scale'] = icon_scale_val
        CONFIG['line_spacing'] = line_spacing_pct

# -----------------------------------------------------------------------------
# STATUS & GENERATE
# -----------------------------------------------------------------------------

# Check what we have
quotes_ready = quotes_file is not None
images_ready = len(images_files) > 0 if images_files else False
fonts_ready = bold_font_file is not None and light_font_file is not None

# Load quotes if available
quotes = []
if quotes_ready:
    quotes_file.seek(0)
    quotes_data = json.load(quotes_file)
    quotes = quotes_data.get('quotes', [])

# Status display
if quotes_ready and (images_ready or use_solid_color) and fonts_ready:
    if use_solid_color:
        st.success(f"✅ Ready: **{len(quotes)} quotes** • Solid color mode")
    else:
        st.success(f"✅ Ready: **{len(quotes)} quotes** • **{len(images_files)} images**")
else:
    missing = []
    if not quotes_ready:
        missing.append("quotes")
    if not images_ready and not use_solid_color:
        missing.append("images")
    if not fonts_ready:
        missing.append("fonts")
    st.warning(f"⚠️ Upload: {', '.join(missing)}")
    st.stop()

# -----------------------------------------------------------------------------
# GENERATE BUTTON
# -----------------------------------------------------------------------------

if st.button("✨ GENERATE ALL", type="primary", use_container_width=True):
    
    # Read font bytes
    bold_font_file.seek(0)
    light_font_file.seek(0)
    bold_bytes = bold_font_file.read()
    light_bytes = light_font_file.read()
    
    # Read grain bytes if provided
    grain_bytes = None
    if grain_file:
        grain_file.seek(0)
        grain_bytes = grain_file.read()
    
    # Read image bytes if not using solid color
    image_bytes_list = []
    if not use_solid_color:
        for img_file in images_files:
            img_file.seek(0)
            image_bytes_list.append(img_file.read())
    
    # Generate images
    generated = []
    progress = st.progress(0, text="Generating...")
    
    for i, quote_data in enumerate(quotes):
        quote_text = quote_data['text']
        saint_name = quote_data['saint']
        
        # Pick random background or use solid color
        if use_solid_color:
            bg_bytes = None
        else:
            bg_bytes = random.choice(image_bytes_list)
        
        # Generate
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
        
        # Create filename with saint name
        safe_name = sanitize_filename(saint_name)
        filename = f"{safe_name}_{i+1:03d}.jpg"
        generated.append((filename, img))
        
        # Update progress
        progress.progress((i + 1) / len(quotes), text=f"Generated {i + 1}/{len(quotes)}")
    
    st.session_state.generated_images = generated
    progress.empty()
    st.success(f"✅ Generated **{len(generated)} images**")

# -----------------------------------------------------------------------------
# DOWNLOAD
# -----------------------------------------------------------------------------

if st.session_state.generated_images:
    # Create ZIP
    zip_data = create_zip(st.session_state.generated_images)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    st.download_button(
        label=f"📥 Download ZIP ({len(st.session_state.generated_images)} images)",
        data=zip_data,
        file_name=f"daily_saint_{timestamp}.zip",
        mime="application/zip",
        use_container_width=True
    )
    
    # Preview (show first 3)
    with st.expander(f"👁️ Preview ({min(3, len(st.session_state.generated_images))} of {len(st.session_state.generated_images)})"):
        preview_cols = st.columns(3)
        for i, (filename, img) in enumerate(st.session_state.generated_images[:3]):
            with preview_cols[i]:
                st.image(img, caption=filename, use_container_width=True)

# -----------------------------------------------------------------------------
# FOOTER
# -----------------------------------------------------------------------------

st.divider()
st.caption("Made with ✝️ for The Daily Saint • Click Generate again for new random pairings")
