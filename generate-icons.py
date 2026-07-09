from PIL import Image, ImageDraw, ImageFont

# Create Favicon and Touch Icons for Zentra Services
output_dir = "./assets/images"

# Lightning bolt icon (simplified)
def create_icon(size):
    img = Image.new('RGBA', (size, size), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Dark background circle
    margin = size // 10
    draw.ellipse([margin, margin, size - margin, size - margin], fill='#0a0a0f')
    
    # Lightning bolt (simplified polygon)
    scale = size / 512  # Base scale
    points = [
        (256 * scale, 100 * scale),  # top
        (200 * scale, 256 * scale),  # middle-left
        (280 * scale, 256 * scale),  # middle-right
        (256 * scale, 412 * scale),  # bottom
        (312 * scale, 256 * scale),  # middle-far-right
        (232 * scale, 256 * scale),  # middle-close-left
    ]
    draw.polygon(points, fill='#00f0ff')
    
    return img

# Generate icons
sizes = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'favicon-96x96.png': 96,
    'apple-touch-icon.png': 180,
    'apple-touch-icon-152x152.png': 152,
    'apple-touch-icon-167x167.png': 167,
    'apple-touch-icon-180x180.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512,
}

for filename, size in sizes.items():
    icon = create_icon(size)
    filepath = f"{output_dir}/{filename}"
    icon.save(filepath, optimize=True)
    print(f"✅ Created: {filename}")

# Create favicon.ico (multi-size)
icon_16 = create_icon(16)
icon_32 = create_icon(32)
icon_48 = create_icon(48)
icon_16.save(f"{output_dir}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("✅ Created: favicon.ico")

print("\n🎨 All Icons generated!")
