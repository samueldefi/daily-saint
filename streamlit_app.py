"""
The Daily Saint - Instagram Quote Image Generator
Simplified version with fixed defaults
"""

import streamlit as st
import json
import io
import random
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import cairosvg
from typing import List, Dict
import zipfile

# =============================================================================
# CONFIGURATION - FIXED DEFAULTS
# =============================================================================

CONFIG = {
    # Canvas size (internal working size)
    'canvas_width': 698,
    'canvas_height': 882,
    
    # Output size (Instagram format)
    'output_width': 1080,
    'output_height': 1350,
    
    # Typography (% of canvas width)
    'quote_font_size_pct': 6.0,  # 42px at 698px width
    'attribution_font_size_pct': 3.15,  # 22px at 698px width
    
    # Spacing
    'side_margin_pct': 24.2,  # 169px at 698px width
    'top_margin_pct': 5.4,  # 48px at 882px height
    'bottom_margin_pct': 5.4,  # 48px at 882px height
    'line_spacing_pct': 120,  # 120% line spacing
    
    # Icon
    'icon_size_pct': 6.9,  # 48px at 698px width
    
    # Colors
    'text_color': '#F4EFE4',  # Cream color
    'bg_color': '#000000',  # Black for solid backgrounds
    
    # Effects
    'film_grain_opacity': 0.15,
}

# =============================================================================
# SESSION STATE
# =============================================================================

if 'quotes' not in st.session_state:
    st.session_state.quotes = []
if 'image_library' not in st.session_state:
    st.session_state.image_library = {}
if 'fonts_loaded' not in st.session_state:
    st.session_state.fonts_loaded = False
if 'icon_loaded' not in st.session_state:
    st.session_state.icon_loaded = False
if 'generation_count' not in st.session_state:
    st.session_state.generation_count = 0

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def load_quotes_from_json(file) -> List[Dict]:
    """Parse quotes JSON file"""
    data = json.load(file)
    quotes = []
    
    for date, saint_data in data.items():
        if 'name' in saint_data and 'quotes' in saint_data:
            saint_name = saint_data['name']
            for quote_text in saint_data['quotes']:
                quotes.append({
                    'feastDay': date,
                    'saint': saint_name,
                    'text': quote_text
                })
    
    return quotes

def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> List[str]:
    """Wrap text to fit within max_width"""
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = font.getbbox(test_line)
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

def apply_film_grain(image: Image.Image, opacity: float = 0.15) -> Image.Image:
    """Apply film grain texture overlay"""
    grain = Image.effect_noise(image.size, 25)
    grain_rgb = grain.convert('RGB')
    
    blended = Image.blend(image, grain_rgb, opacity)
    
    return blended

def generate_image(
    quote_text: str,
    saint_name: str,
    background_img: Image.Image,
    bold_font_path: str,
    light_font_path: str,
    icon_svg: bytes,
    use_grain: bool = True
) -> Image.Image:
    """Generate the quote image"""
    
    width = CONFIG['canvas_width']
    height = CONFIG['canvas_height']
    
    # Calculate sizes from percentages
    quote_size = int(width * CONFIG['quote_font_size_pct'] / 100)
    attr_size = int(width * CONFIG['attribution_font_size_pct'] / 100)
    icon_size = int(width * CONFIG['icon_size_pct'] / 100)
    
    side_margin = int(width * CONFIG['side_margin_pct'] / 100)
    top_margin = int(height * CONFIG['top_margin_pct'] / 100)
    bottom_margin = int(height * CONFIG['bottom_margin_pct'] / 100)
    
    line_spacing_multiplier = CONFIG['line_spacing_pct'] / 100
    
    # Load fonts
    quote_font = ImageFont.truetype(bold_font_path, quote_size)
    attribution_font = ImageFont.truetype(light_font_path, attr_size)
    
    # Prepare background
    bg = background_img.copy()
    bg = bg.resize((width, height), Image.Resampling.LANCZOS)
    bg = bg.convert('L').convert('RGB')
    
    enhancer = ImageEnhance.Contrast(bg)
    bg = enhancer.enhance(0.7)
    
    # Convert icon SVG to PNG
    icon_png = cairosvg.svg2png(
        bytestring=icon_svg,
        output_width=icon_size,
        output_height=icon_size
    )
    icon = Image.open(io.BytesIO(icon_png)).convert('RGBA')
    
    # Center icon horizontally at top
    icon_x = (width - icon_size) // 2
    icon_y = top_margin
    
    # Paste icon
    bg.paste(icon, (icon_x, icon_y), icon)
    
    # Wrap quote text
    max_text_width = width - (2 * side_margin)
    lines = wrap_text(quote_text, quote_font, max_text_width)
    
    # Calculate line height with spacing
    test_bbox = quote_font.getbbox('Ay')
    base_line_height = test_bbox[3] - test_bbox[1]
    line_height = int(base_line_height * line_spacing_multiplier)
    
    total_text_height = len(lines) * line_height
    
    # Attribution positioning
    attr_bbox = attribution_font.getbbox(saint_name)
    attr_height = attr_bbox[3] - attr_bbox[1]
    attr_y = height - bottom_margin - attr_height
    
    # Calculate available space and center quote text
    icon_bottom = icon_y + icon_size
    available_height = attr_y - icon_bottom
    quote_y = icon_bottom + (available_height - total_text_height) // 2
    
    # Draw text
    draw = ImageDraw.Draw(bg)
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
    
    # Apply film grain if enabled
    if use_grain:
        bg = apply_film_grain(bg, CONFIG['film_grain_opacity'])
    
    # Resize to output dimensions
    final = bg.resize(
        (CONFIG['output_width'], CONFIG['output_height']),
        Image.Resampling.LANCZOS
    )
    
    return final

# =============================================================================
# UI
# =============================================================================

st.set_page_config(
    page_title="The Daily Saint - Quote Generator",
    page_icon="✝️",
    layout="wide"
)

st.title("✝️ The Daily Saint")
st.subheader("Instagram Quote Image Generator")

# =============================================================================
# SETUP SECTION
# =============================================================================

with st.expander("⚙️ Setup (Upload Files)", expanded=not st.session_state.fonts_loaded):
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 📜 Quotes Database")
        quotes_file = st.file_uploader("Upload saints-quotes.json", type=['json'], key='quotes_upload')
        if quotes_file:
            st.session_state.quotes = load_quotes_from_json(quotes_file)
            st.success(f"✅ Loaded {len(st.session_state.quotes)} quotes")
        
        st.markdown("#### 🔤 Fonts")
        bold_font = st.file_uploader("Bold Font (Rhymes VFI Bold)", type=['ttf', 'otf'], key='bold_font')
        light_font = st.file_uploader("Light Font (Rhymes VFI Light)", type=['ttf', 'otf'], key='light_font')
        
        if bold_font and light_font:
            st.session_state.bold_font_path = f"/tmp/bold_font.ttf"
            st.session_state.light_font_path = f"/tmp/light_font.ttf"
            with open(st.session_state.bold_font_path, 'wb') as f:
                f.write(bold_font.read())
            with open(st.session_state.light_font_path, 'wb') as f:
                f.write(light_font.read())
            st.session_state.fonts_loaded = True
            st.success("✅ Fonts loaded")
    
    with col2:
        st.markdown("#### ✝️ Icon")
        icon_file = st.file_uploader("Upload cross icon (SVG)", type=['svg'], key='icon_upload')
        if icon_file:
            st.session_state.icon_svg = icon_file.read()
            st.session_state.icon_loaded = True
            st.success("✅ Icon loaded")
        
        st.markdown("#### 🖼️ Background Images")
        uploaded_images = st.file_uploader(
            "Upload background images (JPG/PNG)",
            type=['jpg', 'jpeg', 'png'],
            accept_multiple_files=True,
            key='images_upload'
        )
        
        if uploaded_images:
            for img_file in uploaded_images:
                if img_file.name not in st.session_state.image_library:
                    st.session_state.image_library[img_file.name] = img_file.read()
            st.success(f"✅ Library: {len(st.session_state.image_library)} images")

# Check if setup is complete
setup_complete = (
    len(st.session_state.quotes) > 0 and
    st.session_state.fonts_loaded and
    st.session_state.icon_loaded and
    len(st.session_state.image_library) > 0
)

if not setup_complete:
    st.warning("⚠️ Please complete setup above before generating images")
    st.stop()

st.divider()

# =============================================================================
# GENERATION SECTION
# =============================================================================

# Mode selection
mode = st.radio(
    "Generation Mode",
    options=["Single Image", "Batch Generate"],
    horizontal=True
)

if mode == "Single Image":
    # =============================================================================
    # SINGLE IMAGE MODE
    # =============================================================================
    
    st.header("1️⃣ Select Quote")
    
    # Get unique values
    today = datetime.now().strftime('%m-%d')
    all_dates = sorted(list(set(q['feastDay'] for q in st.session_state.quotes)))
    saint_names = sorted(list(set(q['saint'] for q in st.session_state.quotes)))
    
    col1, col2 = st.columns(2)
    
    with col1:
        date_options = [f"Today ({today})", "All dates"] + all_dates
        selected_date = st.selectbox("Filter by date", options=date_options, index=1)
    
    with col2:
        selected_saint = st.selectbox(
            "Filter by saint",
            options=["All saints"] + saint_names,
            index=0
        )
    
    # Filter quotes
    filtered_quotes = st.session_state.quotes.copy()
    
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
            selected_image_name = st.selectbox("Choose background", options=image_names)
        else:
            if st.button("🔀 Shuffle Background"):
                st.session_state.generation_count += 1
            
            random.seed(st.session_state.generation_count)
            selected_image_name = random.choice(image_names)
            st.write(f"Selected: **{selected_image_name}**")
    
    with col2:
        if selected_image_name:
            preview_img = Image.open(io.BytesIO(st.session_state.image_library[selected_image_name]))
            st.image(preview_img, caption=selected_image_name, use_container_width=True)
    
    # =============================================================================
    # GENERATE
    # =============================================================================
    
    st.header("3️⃣ Generate")
    
    use_grain = st.checkbox("Apply film grain texture", value=True)
    
    if st.button("✨ Generate Image", type="primary", use_container_width=True):
        with st.spinner("Generating..."):
            bg_img = Image.open(io.BytesIO(st.session_state.image_library[selected_image_name]))
            
            result = generate_image(
                quote_text=selected_quote['text'],
                saint_name=selected_quote['saint'],
                background_img=bg_img,
                bold_font_path=st.session_state.bold_font_path,
                light_font_path=st.session_state.light_font_path,
                icon_svg=st.session_state.icon_svg,
                use_grain=use_grain
            )
            
            st.session_state.current_image = result
            st.session_state.current_quote = selected_quote
    
    # Display result
    if 'current_image' in st.session_state:
        st.success("✅ Image generated!")
        st.image(st.session_state.current_image, use_container_width=True)
        
        # Download
        buf = io.BytesIO()
        st.session_state.current_image.save(buf, format='JPEG', quality=95)
        buf.seek(0)
        
        filename = f"{st.session_state.current_quote['saint'].replace(' ', '-')}.jpg"
        st.download_button(
            label="📥 Download Image",
            data=buf,
            file_name=filename,
            mime="image/jpeg",
            use_container_width=True
        )

else:
    # =============================================================================
    # BATCH MODE
    # =============================================================================
    
    st.header("Batch Generate")
    
    col1, col2 = st.columns(2)
    
    with col1:
        batch_count = st.number_input("Number of images to generate", min_value=1, max_value=50, value=10)
        use_grain_batch = st.checkbox("Apply film grain texture", value=True, key='batch_grain')
    
    with col2:
        today = datetime.now().strftime('%m-%d')
        batch_filter = st.selectbox(
            "Filter quotes",
            options=["All quotes", f"Today only ({today})", "Random selection"],
            index=0
        )
    
    if st.button("🚀 Generate Batch", type="primary", use_container_width=True):
        
        # Filter quotes based on selection
        batch_quotes = st.session_state.quotes.copy()
        if batch_filter == f"Today only ({today})":
            batch_quotes = [q for q in batch_quotes if q['feastDay'] == today]
        
        if batch_filter == "Random selection":
            random.shuffle(batch_quotes)
            batch_quotes = batch_quotes[:batch_count]
        else:
            batch_quotes = batch_quotes[:batch_count]
        
        if not batch_quotes:
            st.error("No quotes available for selected filter")
            st.stop()
        
        # Generate images
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            
            image_names = list(st.session_state.image_library.keys())
            
            for idx, quote in enumerate(batch_quotes):
                status_text.text(f"Generating {idx + 1}/{len(batch_quotes)}: {quote['saint']}")
                
                # Random background for each quote
                bg_name = random.choice(image_names)
                bg_img = Image.open(io.BytesIO(st.session_state.image_library[bg_name]))
                
                result = generate_image(
                    quote_text=quote['text'],
                    saint_name=quote['saint'],
                    background_img=bg_img,
                    bold_font_path=st.session_state.bold_font_path,
                    light_font_path=st.session_state.light_font_path,
                    icon_svg=st.session_state.icon_svg,
                    use_grain=use_grain_batch
                )
                
                # Save to ZIP
                img_buffer = io.BytesIO()
                result.save(img_buffer, format='JPEG', quality=95)
                img_buffer.seek(0)
                
                filename = f"{quote['saint'].replace(' ', '-')}-{quote['feastDay']}.jpg"
                zip_file.writestr(filename, img_buffer.getvalue())
                
                progress_bar.progress((idx + 1) / len(batch_quotes))
        
        status_text.text("✅ Batch complete!")
        
        # Download ZIP
        zip_buffer.seek(0)
        st.download_button(
            label=f"📦 Download {len(batch_quotes)} Images (ZIP)",
            data=zip_buffer,
            file_name=f"daily-saint-batch-{datetime.now().strftime('%Y%m%d-%H%M%S')}.zip",
            mime="application/zip",
            use_container_width=True
        )

# =============================================================================
# FOOTER
# =============================================================================

st.divider()
st.caption("Made with ✝️ for The Daily Saint | Simplified Edition")
