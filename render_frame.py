#!/usr/bin/env python3
import sys, os, json, textwrap
from PIL import Image, ImageDraw, ImageFont

def render_frame(persona_path, wisdom_text, persona_name, bar_heights, output_path, frame_type='persona'):
    W, H = 1080, 1920
    img = Image.new('RGB', (W, H), '#08080f')
    draw = ImageDraw.Draw(img)

    # Background image (persona or mudrets portrait)
    try:
        portrait = Image.open(persona_path).convert('RGB')
        portrait = portrait.resize((W, W), Image.NEAREST)
        img.paste(portrait, (0, 0))
        # dark overlay on portrait bottom
        overlay = Image.new('RGBA', (W, W), (8, 8, 15, 160))
        img.paste(Image.new('RGB', (W, W), '#08080f'), (0, 0), overlay)
    except Exception as e:
        print(f'Portrait error: {e}', file=sys.stderr)

    # Scanlines
    for y in range(0, W, 4):
        draw.line([(0, y), (W, y)], fill=(0, 0, 0, 25), width=1)

    # Gold border
    draw.rectangle([4, 4, W-4, H-4], outline='#c8a84b', width=6)

    # Persona name
    try:
        font_name = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 42)
        font_text = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 52)
        font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 32)
    except:
        font_name = ImageFont.load_default()
        font_text = font_name
        font_small = font_name

    name_y = W + 50
    draw.text((W//2, name_y), f'— {persona_name.upper()} —', font=font_name, fill='#c8a84b', anchor='mm')

    # Equalizer bars
    eq_y = W + 120
    bars = bar_heights if bar_heights else [8]*20
    n = len(bars)
    bar_w = 28
    gap = 14
    total = n * (bar_w + gap) - gap
    sx = (W - total) // 2
    for i, h in enumerate(bars):
        x = sx + i * (bar_w + gap)
        draw.rectangle([x, eq_y + 60 - h, x + bar_w, eq_y + 60], fill='#c8a84b')

    # Wisdom text
    text_y = eq_y + 100
    wrapped = textwrap.fill(wisdom_text, width=28)
    lines = wrapped.split('\n')
    for i, line in enumerate(lines):
        draw.text((W//2, text_y + i * 70), line, font=font_text, fill='#e8c878', anchor='mm')

    # Footer
    draw.text((W//2, H - 70), 'mudrets.online', font=font_small, fill='#3a3020', anchor='mm')

    img.save(output_path, 'PNG')

if __name__ == '__main__':
    data = json.loads(sys.argv[1])
    render_frame(
        data['persona_path'],
        data['wisdom_text'],
        data['persona_name'],
        data.get('bar_heights', [8]*20),
        data['output_path'],
        data.get('frame_type', 'persona')
    )
