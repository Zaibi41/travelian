from collections import deque
from pathlib import Path
from shutil import copyfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ATTACHMENTS = ROOT.parent / ".codex-remote-attachments" / "019e2ca5-0bb1-7bc1-a6fe-7deab1589111" / "18db7d04-d582-4ae1-9e81-7cd32b5de3f9"
PUBLIC = ROOT / "public"


def transparent_outer_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    queue = deque()
    visited = set()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        red, green, blue, _ = pixels[x, y]
        if min(red, green, blue) < 238:
            continue
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))
    return rgba


def main() -> None:
    copyfile(ATTACHMENTS / "1-Photo-1.jpg", PUBLIC / "travelian-official-logo.jpg")
    icon = transparent_outer_background(Image.open(ATTACHMENTS / "2-Photo-2.jpg"))
    icon.save(PUBLIC / "travelian-official-icon.png")
    icon.resize((180, 180), Image.Resampling.LANCZOS).save(PUBLIC / "apple-touch-icon.png")
    icon.resize((32, 32), Image.Resampling.LANCZOS).save(PUBLIC / "favicon-32x32.png")
    icon.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    main()
