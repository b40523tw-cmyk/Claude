"""Cut a 3-pose monster sheet (idle, attack, hurt; left to right, transparent) into
src/assets/monsters/<id>-<pose>.webp.  Usage: python3 scripts/split-sprite.py <sheet.png> <monster id>

Poses may overlap (sparkles, swooshes), so pieces are found as connected blobs on a
downscaled alpha mask; the three biggest blobs are the poses and every other blob
joins the pose whose centre is nearest."""
import sys
from collections import deque
from PIL import Image, ImageFilter

sheet, mid = sys.argv[1], sys.argv[2]
im = Image.open(sheet).convert('RGBA')
W, H = im.size
K = 4  # downscale factor for the blob search
small = im.getchannel('A').resize((W // K, H // K), Image.BOX).point(lambda v: 255 if v > 24 else 0)
sw, sh = small.size
m = small.load()
label = [[-1] * sw for _ in range(sh)]
blobs = []  # (size, xs, ys, cx)
for y in range(sh):
    for x in range(sw):
        if m[x, y] and label[y][x] < 0:
            i = len(blobs); q = deque([(x, y)]); label[y][x] = i; pts = []
            while q:
                px, py = q.popleft(); pts.append((px, py))
                for nx, ny in ((px+1,py),(px-1,py),(px,py+1),(px,py-1)):
                    if 0 <= nx < sw and 0 <= ny < sh and m[nx, ny] and label[ny][nx] < 0:
                        label[ny][nx] = i; q.append((nx, ny))
            blobs.append((len(pts), sum(p[0] for p in pts) / len(pts)))
main = sorted(sorted(range(len(blobs)), key=lambda i: -blobs[i][0])[:3], key=lambda i: blobs[i][1])
if len(main) < 3: sys.exit('fewer than three pieces found')
owner = {}
for i, (_, cx) in enumerate(blobs):
    owner[i] = min(range(3), key=lambda k: abs(blobs[main[k]][1] - cx))
for k, pose in enumerate(['idle', 'attack', 'hurt']):
    mask = Image.new('L', (sw, sh), 0); mp = mask.load()
    for y in range(sh):
        for x in range(sw):
            if label[y][x] >= 0 and owner[label[y][x]] == k: mp[x, y] = 255
    mask = mask.filter(ImageFilter.MaxFilter(3)).resize((W, H), Image.NEAREST)
    a = Image.composite(im.getchannel('A'), Image.new('L', (W, H), 0), mask)
    piece = im.copy(); piece.putalpha(a)
    c = piece.crop(a.point(lambda v: 255 if v > 8 else 0).getbbox())
    s = max(c.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(c, ((s - c.width) // 2, s - c.height))
    sq.resize((512, 512), Image.LANCZOS).save(f'src/assets/monsters/{mid}-{pose}.webp', quality=82, method=6)
    print(pose, c.size)
