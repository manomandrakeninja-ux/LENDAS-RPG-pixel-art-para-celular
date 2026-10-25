"""Gera uma paisagem em pixel art (vale ao pôr do sol) e salva como PNG."""

import os
import random

from PIL import Image, ImageDraw

W, H = 320, 180
SCALE = 3
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "paisagem-pixel.png")

SUN_X, SUN_Y = 210, 62
LAKE_TOP, LAKE_BOTTOM = 118, 150


def lerp(c0, c1, t):
    return tuple(int(round(c0[i] + (c1[i] - c0[i]) * t)) for i in range(3))


def ramp(stops, t):
    if t <= stops[0][0]:
        return stops[0][1]
    if t >= stops[-1][0]:
        return stops[-1][1]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if p0 <= t <= p1:
            k = (t - p0) / (p1 - p0) if p1 > p0 else 0.0
            return lerp(c0, c1, k)
    return stops[-1][1]


def vgradient(draw, box, stops):
    x0, y0, x1, y1 = box
    height = max(1, y1 - y0 + 1)
    for y in range(y0, y1 + 1):
        t = (y - y0) / (height - 1) if height > 1 else 0.0
        draw.line([(x0, y), (x1, y)], fill=ramp(stops, t))


def pine(draw, x, base_y, height, color, shade):
    trunk = max(1, height // 12)
    draw.rectangle([x - trunk // 2, base_y - height // 6, x + trunk // 2, base_y],
                   fill=(48, 32, 30))
    for i in range(3):
        t = i / 2
        top = base_y - height + int(t * height * 0.48)
        half = max(2, int(height * 0.44 * (0.45 + t * 0.65)))
        bottom = base_y - int(height * 0.20) + int(t * height * 0.10)
        draw.polygon([(x, top), (x - half, bottom), (x + half, bottom)], fill=color)
        draw.polygon([(x, top), (x + half // 3, bottom), (x + half, bottom)], fill=shade)


def round_tree(draw, x, base_y, height, leaf, leaf_light):
    trunk = max(2, height // 6)
    draw.rectangle([x - trunk // 2, base_y - height // 2, x + trunk // 2, base_y],
                   fill=(56, 34, 28))
    radius = max(3, int(height * 0.40))
    cy = base_y - height // 2 - radius // 3
    draw.ellipse([x - radius, cy - radius, x + radius, cy + radius], fill=leaf)
    draw.ellipse([x - radius // 2, cy - radius - height // 10,
                  x + radius // 3, cy - radius + height // 10], fill=leaf_light)
    draw.ellipse([x + radius // 4, cy - radius // 2,
                  x + radius, cy + radius // 2], fill=leaf)


def mountain_layer(draw, base_y, seed, color, light, min_h, max_h, min_half, max_half):
    rnd = random.Random(seed)
    x = -10
    while x < W + 10:
        half = rnd.randint(min_half, max_half)
        peak_y = base_y - rnd.randint(min_h, max_h)
        draw.polygon([(x, base_y), (x + half, peak_y), (x + half * 2, base_y)], fill=color)
        draw.polygon([(x + half, peak_y), (x + half * 2, base_y),
                      (x + half * 1.3, base_y)], fill=light)
        x += half


def main():
    rnd = random.Random(11)
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)

    # --- Ceu ---
    vgradient(d, (0, 0, W - 1, LAKE_TOP), [
        (0.00, (16, 15, 48)),
        (0.30, (52, 36, 98)),
        (0.55, (124, 58, 122)),
        (0.75, (206, 92, 106)),
        (0.90, (245, 140, 110)),
        (1.00, (255, 196, 132)),
    ])

    # Estrelas no topo
    for _ in range(46):
        sx, sy = rnd.randrange(W), rnd.randrange(0, 58)
        d.point((sx, sy), fill=(255, 246, 226))

    # Nuvens em faixas
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for cx, cy, cw, ch, alpha in [
        (48, 34, 70, 7, 120), (120, 24, 54, 6, 95), (250, 44, 66, 7, 110),
        (86, 58, 92, 6, 130), (176, 18, 48, 5, 80), (286, 70, 78, 6, 120),
    ]:
        od.ellipse([cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2],
                   fill=(255, 176, 158, alpha))
        od.ellipse([cx - cw // 4, cy - ch, cx + cw // 3, cy + ch // 3],
                   fill=(255, 190, 168, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # --- Sol e brilho ---
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for radius, alpha in [(46, 14), (34, 24), (24, 40), (17, 70)]:
        od.ellipse([SUN_X - radius, SUN_Y - radius, SUN_X + radius, SUN_Y + radius],
                   fill=(255, 198, 126, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)
    d.ellipse([SUN_X - 13, SUN_Y - 13, SUN_X + 13, SUN_Y + 13], fill=(255, 222, 152))
    d.ellipse([SUN_X - 9, SUN_Y - 9, SUN_X + 9, SUN_Y + 9], fill=(255, 246, 206))

    # --- Montanhas ---
    mountain_layer(d, 112, 3, (74, 60, 116), (124, 90, 150), 24, 50, 18, 38)
    mountain_layer(d, 116, 8, (54, 48, 94), (88, 70, 126), 12, 32, 14, 28)

    # Floresta distante na margem
    d.rectangle([0, 108, W - 1, LAKE_TOP], fill=(38, 44, 72))
    for _ in range(46):
        tx = rnd.randrange(W)
        th = rnd.randint(4, 9)
        d.polygon([(tx, 112 - th), (tx - th // 2, 114), (tx + th // 2, 114)],
                  fill=(28, 36, 58))

    # --- Lago ---
    vgradient(d, (0, LAKE_TOP, W - 1, LAKE_BOTTOM), [
        (0.00, (214, 126, 124)),
        (0.22, (150, 92, 132)),
        (0.55, (66, 62, 112)),
        (1.00, (28, 38, 72)),
    ])
    d.line([(0, LAKE_TOP), (W - 1, LAKE_TOP)], fill=(255, 186, 148))

    # Reflexo do sol na água
    rnd = random.Random(5)
    for y in range(LAKE_TOP, LAKE_BOTTOM):
        t = (y - LAKE_TOP) / (LAKE_BOTTOM - LAKE_TOP)
        width = int(3 + t * 20)
        if rnd.random() < 0.72:
            off = rnd.randint(-2, 2)
            color = lerp((255, 214, 158), (255, 172, 138), t)
            d.rectangle([SUN_X - width // 2 + off, y,
                         SUN_X + width // 2 + off, y], fill=color)

    # Reflexo das montanhas no lago
    for y in range(LAKE_TOP + 4, LAKE_BOTTOM, 3):
        d.line([(0, y), (W - 1, y)], fill=(52, 50, 96))

    # Ondas
    for _ in range(70):
        wx = rnd.randrange(W)
        wy = rnd.randrange(LAKE_TOP + 2, LAKE_BOTTOM)
        length = rnd.randint(3, 9)
        d.line([(wx, wy), (min(W - 1, wx + length), wy)],
               fill=(186, 156, 178) if wy < LAKE_TOP + 16 else (92, 106, 158))

    # --- Margem próxima ---
    vgradient(d, (0, LAKE_BOTTOM, W - 1, H - 1), [
        (0.00, (30, 58, 48)),
        (0.45, (22, 48, 40)),
        (1.00, (12, 30, 28)),
    ])
    d.line([(0, LAKE_BOTTOM), (W - 1, LAKE_BOTTOM)], fill=(46, 76, 58))

    # Cabana com janela acesa
    cab_x = 62
    d.polygon([(cab_x - 8, 142), (cab_x + 20, 142), (cab_x + 6, 132)], fill=(92, 48, 48))
    d.rectangle([cab_x, 142, cab_x + 14, 153], fill=(64, 44, 40))
    d.rectangle([cab_x + 4, 145, cab_x + 9, 150], fill=(255, 212, 128))
    d.rectangle([cab_x + 12, 146, cab_x + 15, 153], fill=(46, 32, 30))
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([cab_x - 4, 137, cab_x + 22, 153], fill=(255, 196, 110, 60))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    # Árvores da margem
    for tx, th in [(26, 16), (40, 12), (110, 14), (128, 10), (252, 15), (266, 11), (296, 14)]:
        pine(d, tx, LAKE_BOTTOM + 2, th, (22, 46, 44), (14, 32, 32))

    # Árvores grandes em primeiro plano
    round_tree(d, 34, H, 74, (16, 48, 42), (26, 68, 52))
    round_tree(d, 292, H, 64, (16, 44, 40), (24, 62, 50))
    pine(d, 258, H, 46, (14, 40, 38), (10, 28, 30))
    pine(d, 240, H, 34, (14, 40, 38), (10, 28, 30))

    # Grama e flores
    rnd = random.Random(21)
    for _ in range(220):
        gx = rnd.randrange(W)
        gy = rnd.randrange(LAKE_BOTTOM + 2, H)
        if rnd.random() < 0.5:
            d.point((gx, gy), fill=(30, 72, 54))
        else:
            d.point((gx, gy), fill=(22, 56, 46))
    for _ in range(18):
        fx = rnd.randrange(10, W - 10)
        fy = rnd.randrange(LAKE_BOTTOM + 6, H - 4)
        color = (255, 196, 210) if rnd.random() < 0.5 else (255, 226, 150)
        d.point((fx, fy), fill=color)
        d.point((fx, fy + 1), fill=(24, 60, 48))

    # Pássaros
    for bx, by in [(58, 26), (70, 18), (78, 28), (148, 30)]:
        d.point((bx - 2, by), fill=(38, 30, 54))
        d.point((bx - 1, by - 1), fill=(38, 30, 54))
        d.point((bx, by), fill=(38, 30, 54))
        d.point((bx + 1, by - 1), fill=(38, 30, 54))
        d.point((bx + 2, by), fill=(38, 30, 54))

    # Vinheta suave
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(26):
        alpha = int(2 + i * 1.6)
        od.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(18, 12, 40, alpha),
                     width=1)
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    out = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
    out.save(OUT)
    print(f"OK -> {OUT} ({out.width}x{out.height})")


if __name__ == "__main__":
    main()
