#!/usr/bin/env python3
"""
Generate a cohesive PNG icon pack for the coffee ordering project.

Output directory:
  frontend/public/icons/*.png
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont

SIZE = 128
FG = (246, 250, 255, 255)
STROKE = 5
ROUND_RADIUS = 28


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    raw = hex_color.strip().lstrip("#")
    if len(raw) != 6:
        raise ValueError(f"Invalid color: {hex_color}")
    return tuple(int(raw[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def darken(color: tuple[int, int, int], amount: int) -> tuple[int, int, int]:
    return (
        max(0, color[0] - amount),
        max(0, color[1] - amount),
        max(0, color[2] - amount),
    )


def make_background(top_hex: str, bottom_hex: str) -> Image.Image:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    base = hex_to_rgb(top_hex)
    border = darken(base, 22)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (8, 8, SIZE - 8, SIZE - 8),
        radius=ROUND_RADIUS,
        fill=(*base, 255),
        outline=(*border, 255),
        width=2,
    )
    return canvas


def draw_list_icon(d: ImageDraw.ImageDraw) -> None:
    for i, y in enumerate((44, 64, 84)):
        r = 3 if i != 0 else 2
        d.ellipse((30 - r, y - r, 30 + r, y + r), fill=FG)
        d.line((42, y, 90, y), fill=FG, width=STROKE)


def draw_profile_icon(d: ImageDraw.ImageDraw) -> None:
    d.ellipse((50, 34, 78, 62), outline=FG, width=STROKE)
    d.arc((34, 56, 94, 102), start=200, end=-20, fill=FG, width=STROKE)


def draw_users_icon(d: ImageDraw.ImageDraw) -> None:
    d.ellipse((42, 42, 62, 62), outline=FG, width=STROKE)
    d.ellipse((66, 38, 90, 62), outline=FG, width=STROKE)
    d.arc((30, 58, 72, 98), start=200, end=-20, fill=FG, width=STROKE)
    d.arc((56, 56, 102, 100), start=200, end=-20, fill=FG, width=STROKE)


def draw_beans_icon(d: ImageDraw.ImageDraw) -> None:
    d.ellipse((36, 44, 68, 88), outline=FG, width=STROKE)
    d.ellipse((60, 40, 92, 84), outline=FG, width=STROKE)
    d.arc((44, 48, 64, 86), start=80, end=270, fill=FG, width=4)
    d.arc((68, 44, 88, 82), start=80, end=270, fill=FG, width=4)


def draw_coffee_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((34, 48, 82, 84), radius=8, outline=FG, width=STROKE)
    d.arc((74, 54, 98, 78), start=270, end=90, fill=FG, width=STROKE)
    d.line((30, 84, 86, 84), fill=FG, width=STROKE)
    d.arc((42, 30, 54, 48), start=190, end=355, fill=FG, width=4)
    d.arc((56, 30, 68, 48), start=190, end=355, fill=FG, width=4)


def draw_folder_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((30, 48, 98, 88), radius=10, outline=FG, width=STROKE)
    d.rounded_rectangle((38, 38, 66, 50), radius=4, outline=FG, width=STROKE)


def draw_gift_icon(d: ImageDraw.ImageDraw) -> None:
    d.rectangle((34, 56, 94, 88), outline=FG, width=STROKE)
    d.line((64, 56, 64, 88), fill=FG, width=STROKE)
    d.line((34, 72, 94, 72), fill=FG, width=STROKE)
    d.arc((48, 38, 66, 58), start=210, end=35, fill=FG, width=4)
    d.arc((62, 38, 80, 58), start=145, end=330, fill=FG, width=4)


def draw_gear_icon(d: ImageDraw.ImageDraw) -> None:
    d.ellipse((46, 46, 82, 82), outline=FG, width=STROKE)
    d.ellipse((58, 58, 70, 70), fill=FG)
    for deg in range(0, 360, 45):
        rad = math.radians(deg)
        x1 = 64 + math.cos(rad) * 22
        y1 = 64 + math.sin(rad) * 22
        x2 = 64 + math.cos(rad) * 30
        y2 = 64 + math.sin(rad) * 30
        d.line((x1, y1, x2, y2), fill=FG, width=4)


def draw_shield_block_icon(d: ImageDraw.ImageDraw) -> None:
    shield = [(64, 30), (88, 42), (84, 74), (64, 94), (44, 74), (40, 42)]
    d.polygon(shield, outline=FG)
    d.line((43, 85, 87, 41), fill=FG, width=STROKE)


def draw_refresh_icon(d: ImageDraw.ImageDraw) -> None:
    d.arc((30, 30, 98, 98), start=30, end=190, fill=FG, width=STROKE)
    d.arc((30, 30, 98, 98), start=220, end=380, fill=FG, width=STROKE)
    d.polygon([(89, 39), (100, 41), (93, 50)], fill=FG)
    d.polygon([(39, 89), (28, 87), (35, 78)], fill=FG)


def draw_truck_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((28, 52, 78, 82), radius=5, outline=FG, width=STROKE)
    d.rounded_rectangle((78, 58, 98, 82), radius=4, outline=FG, width=STROKE)
    d.line((28, 82, 98, 82), fill=FG, width=STROKE)
    d.ellipse((36, 78, 48, 90), outline=FG, width=4)
    d.ellipse((72, 78, 84, 90), outline=FG, width=4)


def draw_scooter_icon(d: ImageDraw.ImageDraw) -> None:
    d.line((34, 72, 52, 72), fill=FG, width=STROKE)
    d.line((52, 72, 70, 60), fill=FG, width=STROKE)
    d.line((64, 60, 78, 60), fill=FG, width=STROKE)
    d.line((74, 60, 82, 68), fill=FG, width=STROKE)
    d.ellipse((30, 68, 42, 80), outline=FG, width=4)
    d.ellipse((66, 68, 78, 80), outline=FG, width=4)


def draw_note_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((36, 34, 92, 92), radius=8, outline=FG, width=STROKE)
    d.line((46, 52, 80, 52), fill=FG, width=4)
    d.line((46, 66, 74, 66), fill=FG, width=4)
    d.line((66, 78, 92, 52), fill=FG, width=STROKE - 1)


def draw_pin_icon(d: ImageDraw.ImageDraw) -> None:
    d.ellipse((46, 34, 82, 70), outline=FG, width=STROKE)
    d.ellipse((58, 46, 70, 58), fill=FG)
    d.polygon([(64, 96), (48, 66), (80, 66)], outline=FG)


def draw_store_icon(d: ImageDraw.ImageDraw, label: str | None = None) -> None:
    d.rounded_rectangle((30, 44, 98, 92), radius=8, outline=FG, width=STROKE)
    d.line((30, 56, 98, 56), fill=FG, width=STROKE)
    d.line((44, 56, 44, 92), fill=FG, width=4)
    d.line((84, 56, 84, 92), fill=FG, width=4)

    if label:
        font = get_font(20)
        bbox = d.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        d.text((64 - tw / 2, 64 - th / 2), label, fill=FG, font=font)


def draw_card_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((30, 44, 98, 86), radius=8, outline=FG, width=STROKE)
    d.line((36, 60, 92, 60), fill=FG, width=4)
    d.line((38, 74, 58, 74), fill=FG, width=4)


def draw_cash_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((28, 46, 100, 84), radius=7, outline=FG, width=STROKE)
    d.ellipse((53, 56, 75, 78), outline=FG, width=4)
    d.line((30, 65, 42, 65), fill=FG, width=4)
    d.line((86, 65, 98, 65), fill=FG, width=4)


def draw_linepay_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((30, 40, 98, 84), radius=12, outline=FG, width=STROKE)
    d.polygon([(52, 84), (58, 96), (66, 84)], fill=FG)
    font = get_font(18)
    text = "LINE"
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    d.text((64 - tw / 2, 58 - th / 2), text, fill=FG, font=font)


def draw_bank_icon(d: ImageDraw.ImageDraw) -> None:
    d.polygon([(64, 34), (32, 50), (96, 50)], outline=FG)
    d.line((32, 88, 96, 88), fill=FG, width=STROKE)
    for x in (40, 52, 64, 76, 88):
        d.line((x, 52, x, 86), fill=FG, width=4)


def draw_cart_icon(d: ImageDraw.ImageDraw) -> None:
    d.line((34, 44, 44, 44), fill=FG, width=STROKE)
    d.line((44, 44, 48, 72), fill=FG, width=STROKE)
    d.polygon([(50, 48), (96, 48), (90, 72), (52, 72)], outline=FG)
    d.ellipse((54, 76, 64, 86), outline=FG, width=4)
    d.ellipse((78, 76, 88, 86), outline=FG, width=4)


def draw_bell_icon(d: ImageDraw.ImageDraw) -> None:
    d.arc((36, 30, 92, 82), start=200, end=-20, fill=FG, width=STROKE)
    d.line((42, 80, 86, 80), fill=FG, width=STROKE)
    d.ellipse((58, 84, 70, 96), fill=FG)


def draw_box_icon(d: ImageDraw.ImageDraw) -> None:
    d.polygon([(64, 34), (34, 48), (64, 62), (94, 48)], outline=FG)
    d.polygon([(34, 48), (34, 82), (64, 96), (64, 62)], outline=FG)
    d.polygon([(94, 48), (94, 82), (64, 96), (64, 62)], outline=FG)
    d.line((64, 34, 64, 62), fill=FG, width=4)


def draw_map_icon(d: ImageDraw.ImageDraw) -> None:
    d.polygon([(34, 44), (54, 38), (74, 44), (94, 38), (94, 84), (74, 90), (54, 84), (34, 90)], outline=FG)
    d.line((54, 38, 54, 84), fill=FG, width=4)
    d.line((74, 44, 74, 90), fill=FG, width=4)
    d.ellipse((58, 52, 70, 64), outline=FG, width=3)


def draw_bag_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((36, 46, 92, 92), radius=7, outline=FG, width=STROKE)
    d.arc((46, 30, 82, 58), start=190, end=-10, fill=FG, width=4)


def draw_tag_icon(d: ImageDraw.ImageDraw) -> None:
    d.polygon([(34, 50), (74, 50), (96, 66), (74, 82), (34, 82)], outline=FG)
    d.ellipse((42, 62, 50, 70), fill=FG)
    d.line((50, 66, 72, 66), fill=FG, width=4)


def draw_copy_icon(d: ImageDraw.ImageDraw) -> None:
    d.rounded_rectangle((44, 38, 90, 84), radius=6, outline=FG, width=STROKE - 1)
    d.rounded_rectangle((30, 50, 76, 96), radius=6, outline=FG, width=STROKE - 1)


def draw_grip_icon(d: ImageDraw.ImageDraw) -> None:
    for y in (50, 64, 78):
        for x in (50, 64, 78):
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=FG)


def draw_refund_icon(d: ImageDraw.ImageDraw) -> None:
    d.arc((30, 34, 98, 102), start=35, end=240, fill=FG, width=STROKE)
    d.polygon([(28, 76), (40, 64), (44, 82)], fill=FG)


def draw_selected_icon(d: ImageDraw.ImageDraw) -> None:
    d.ellipse((34, 34, 94, 94), outline=FG, width=STROKE)
    d.line((48, 66, 60, 78), fill=FG, width=STROKE)
    d.line((60, 78, 84, 50), fill=FG, width=STROKE)


def draw_section_icon(d: ImageDraw.ImageDraw) -> None:
    d.polygon([(34, 48), (80, 48), (96, 64), (80, 80), (34, 80)], outline=FG)
    d.ellipse((42, 60, 50, 68), fill=FG)
    d.line((56, 64, 76, 64), fill=FG, width=4)


def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


PALETTE_MAP = {
    "brand": ("#B9895A", "#5E3F25"),
    "nav": ("#6BA8E8", "#2D5F97"),
    "shop": ("#E0B35A", "#9E6B21"),
    "logistics": ("#54BEB7", "#1E7E79"),
    "payment": ("#56B56F", "#1F7944"),
    "danger": ("#D37A86", "#8E3342"),
    "neutral": ("#7F95AA", "#3F566C"),
    "accent": ("#64A6E0", "#315D9D"),
    "state": ("#67B687", "#2D7B56"),
    "focus": ("#7E94D8", "#4A59A1"),
}

Drawer = Callable[[ImageDraw.ImageDraw], None]

DRAWERS: dict[str, Drawer] = {
    "list": draw_list_icon,
    "profile": draw_profile_icon,
    "users": draw_users_icon,
    "beans": draw_beans_icon,
    "coffee": draw_coffee_icon,
    "folder": draw_folder_icon,
    "gift": draw_gift_icon,
    "gear": draw_gear_icon,
    "shield_block": draw_shield_block_icon,
    "refresh": draw_refresh_icon,
    "truck": draw_truck_icon,
    "scooter": draw_scooter_icon,
    "note": draw_note_icon,
    "pin": draw_pin_icon,
    "card": draw_card_icon,
    "cash": draw_cash_icon,
    "linepay": draw_linepay_icon,
    "bank": draw_bank_icon,
    "cart": draw_cart_icon,
    "bell": draw_bell_icon,
    "box": draw_box_icon,
    "map": draw_map_icon,
    "bag": draw_bag_icon,
    "tag": draw_tag_icon,
    "copy": draw_copy_icon,
    "grip": draw_grip_icon,
    "refund": draw_refund_icon,
    "selected": draw_selected_icon,
    "section": draw_section_icon,
}


ICON_SPECS: dict[str, tuple[str, str]] = {
    "announcement-bell.png": ("accent", "bell"),
    "blacklist-shield.png": ("danger", "shield_block"),
    "brand-coffee.png": ("brand", "coffee"),
    "cart-bag.png": ("shop", "cart"),
    "categories-folder.png": ("neutral", "folder"),
    "copy-doc.png": ("neutral", "copy"),
    "delivery-scooter.png": ("logistics", "scooter"),
    "delivery-truck.png": ("logistics", "truck"),
    "drag-grip.png": ("neutral", "grip"),
    "family-mart-store.png": ("state", "store_f"),
    "form-fields.png": ("focus", "list"),
    "in-store-bag.png": ("shop", "bag"),
    "location-pin.png": ("danger", "pin"),
    "map-route.png": ("logistics", "map"),
    "notes-pencil.png": ("shop", "note"),
    "orders-list.png": ("nav", "list"),
    "payment-bank.png": ("payment", "bank"),
    "payment-card.png": ("payment", "card"),
    "payment-cash.png": ("payment", "cash"),
    "payment-linepay.png": ("payment", "linepay"),
    "products-beans.png": ("brand", "beans"),
    "profile-user.png": ("accent", "profile"),
    "promotions-gift.png": ("danger", "gift"),
    "refresh-sync.png": ("accent", "refresh"),
    "refund-arrow.png": ("neutral", "refund"),
    "section-tag.png": ("focus", "section"),
    "selected-check.png": ("focus", "selected"),
    "settings-gear.png": ("neutral", "gear"),
    "seven-eleven-store.png": ("state", "store_7"),
    "shipping-box.png": ("logistics", "box"),
    "status-store.png": ("state", "store_open"),
    "store-front.png": ("state", "store"),
    "users-group.png": ("accent", "users"),
}


def draw_by_name(name: str, d: ImageDraw.ImageDraw) -> None:
    if name == "store":
        draw_store_icon(d, None)
        return
    if name == "store_7":
        draw_store_icon(d, "7")
        return
    if name == "store_f":
        draw_store_icon(d, "F")
        return
    if name == "store_open":
        draw_store_icon(d, "OPEN")
        return
    DRAWERS[name](d)


def render_icon(palette: tuple[str, str], shape: str) -> Image.Image:
    image = make_background(palette[0], palette[1])
    draw = ImageDraw.Draw(image)
    draw_by_name(shape, draw)
    return image


def create_preview_sheet(icon_paths: list[Path], out_file: Path) -> None:
    cols = 6
    cell = 170
    rows = (len(icon_paths) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * cell + 30), "#F3F5F9")
    draw = ImageDraw.Draw(sheet)
    font = get_font(12)

    for i, icon_path in enumerate(icon_paths):
        img = Image.open(icon_path).convert("RGBA")
        x = (i % cols) * cell + 21
        y = (i // cols) * cell + 16
        sheet.paste(img, (x, y), img)
        label = icon_path.stem
        draw.text((x, y + 132), label, fill="#354254", font=font)

    out_file.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_file)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate project PNG icons")
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Also create a preview contact sheet under /tmp",
    )
    args = parser.parse_args()

    icon_dir = Path("frontend/public/icons")
    icon_dir.mkdir(parents=True, exist_ok=True)

    rendered_paths: list[Path] = []
    for filename, (palette_key, shape) in ICON_SPECS.items():
        palette = PALETTE_MAP[palette_key]
        img = render_icon(palette, shape)
        output = icon_dir / filename
        img.save(output)
        rendered_paths.append(output)

    if args.preview:
        create_preview_sheet(sorted(rendered_paths), Path("/tmp/generated-icon-sheet.png"))

    print(f"Generated {len(rendered_paths)} icons in {icon_dir}")


if __name__ == "__main__":
    main()
