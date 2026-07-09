from PIL import Image, ImageDraw, ImageFont
import os

# Create OG Images for Zentra Services
output_dir = "./assets/images"
os.makedirs(output_dir, exist_ok=True)

# OG Image dimensions: 1200x630
width, height = 1200, 630

def create_og_image(filename, title, subtitle=""):
    # Create dark background with gradient
    img = Image.new('RGB', (width, height), color='#0a0a0f')
    draw = ImageDraw.Draw(img)
    
    # Gradient effect (simple)
    for y in range(height):
        intensity = int(10 + (y / height) * 20)
        color = (intensity, intensity + 5, intensity + 10)
        draw.line([(0, y), (width, y)], fill=color)
    
    # Cyan accent line (top)
    draw.rectangle([(0, 0), (width, 5)], fill='#00f0ff')
    
    # Draw Title (large)
    try:
        font_title = ImageFont.truetype("arial.ttf", 80)
        font_subtitle = ImageFont.truetype("arial.ttf", 40)
    except:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
    
    # Center text
    title_bbox = draw.textbbox((0, 0), title, font=font_title)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = 220
    
    # Title with glow effect (cyan)
    for offset in [(-2, -2), (2, 2), (-2, 2), (2, -2)]:
        draw.text((title_x + offset[0], title_y + offset[1]), title, fill='#00f0ff', font=font_title)
    draw.text((title_x, title_y), title, fill='#ffffff', font=font_title)
    
    # Subtitle
    if subtitle:
        subtitle_bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
        subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
        subtitle_x = (width - subtitle_width) // 2
        subtitle_y = title_y + 100
        draw.text((subtitle_x, subtitle_y), subtitle, fill='#888888', font=font_subtitle)
    
    # Bottom branding
    branding = "ZENTRA.SERVICES"
    branding_bbox = draw.textbbox((0, 0), branding, font=font_subtitle)
    branding_width = branding_bbox[2] - branding_bbox[0]
    draw.text(((width - branding_width) // 2, 520), branding, fill='#00f0ff', font=font_subtitle)
    
    # Save
    filepath = os.path.join(output_dir, filename)
    img.save(filepath, quality=90, optimize=True)
    print(f"✅ Created: {filename}")

# Generate OG Images
create_og_image("og-default.jpg", "ZENTRA", "Tech & Hardware Hub")
create_og_image("og-home.jpg", "BUILD THE", "FUTURE")
create_og_image("og-about.jpg", "ABOUT", "Salih - Founder")
create_og_image("og-products.jpg", "SUPPLY", "131,530 Products")
create_og_image("og-news.jpg", "INTEL", "Tech News")

print("\n🎨 All OG Images generated!")
