"""Gera os ícones SVG próprios do Hortifruti Digital (estilo flat, viewBox 64x64).

Uso: python3 build_icons.py  ->  escreve custom/*.svg e catalog.json
Sem dependências. Cada ícone é uma função que devolve o corpo do SVG.
"""
import json
import math
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'custom')

# ------------------------------------------------------------------ primitivas

def svg(*parts):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + ''.join(parts) + '</svg>'

def f(n):
    s = f'{n:.1f}'
    return s[:-2] if s.endswith('.0') else s

def c(cx, cy, r, fill, extra=''):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{extra}/>'

def e(cx, cy, rx, ry, fill, rot=None, extra=''):
    t = f' transform="rotate({f(rot)} {f(cx)} {f(cy)})"' if rot is not None else ''
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{t}{extra}/>'

def p(d, fill='none', stroke=None, w=None, extra=''):
    a = f'<path d="{d}" fill="{fill}"'
    if stroke:
        a += f' stroke="{stroke}" stroke-width="{f(w)}" stroke-linecap="round" stroke-linejoin="round"'
    return a + extra + '/>'

def g(content, tr):
    return f'<g transform="{tr}">{content}</g>'

def rr(x, y, w, h, r, fill, extra=''):
    return f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{f(r)}" fill="{fill}"{extra}/>'

def ln(x1, y1, x2, y2, stroke, w, extra=''):
    return p(f'M{f(x1)} {f(y1)}L{f(x2)} {f(y2)}', stroke=stroke, w=w, extra=extra)

def poly(pts, fill, extra=''):
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"{extra}/>'

def star_pts(cx, cy, R, r, n=5, rot=-90):
    pts = []
    for i in range(2 * n):
        a = math.radians(rot + i * 180 / n)
        rad = R if i % 2 == 0 else r
        pts.append(f'{f(cx + rad * math.cos(a))},{f(cy + rad * math.sin(a))}')
    return pts

def hl(cx, cy, rx, ry, rot=-30, op=.35):
    return e(cx, cy, rx, ry, '#fff', rot, f' opacity="{op}"')

def leaf(x, y, ang, L, W, fill, rib=None):
    d = (f'M0 0C{f(W/2)} {f(-L*.3)} {f(W/2)} {f(-L*.75)} 0 {f(-L)}'
         f'C{f(-W/2)} {f(-L*.75)} {f(-W/2)} {f(-L*.3)} 0 0z')
    body = p(d, fill)
    if rib:
        body += p(f'M0 -1V{f(-L*.85)}', stroke=rib, w=1.2)
    return g(body, f'translate({f(x)} {f(y)}) rotate({f(ang)})')

def stem_to(x, y, color, w=2, base=(32, 58)):
    bx, by = base
    return p(f'M{bx} {by}Q{f((bx+x)/2)} {f(by-12)} {f(x)} {f(y)}', stroke=color, w=w)

def band(y=46, color='#C0392B'):
    return rr(26, y, 12, 5, 2, color)

def calyx(cx, cy, R, fill):
    return poly(star_pts(cx, cy, R, R * .4, 5), fill,
                f' stroke="{fill}" stroke-width="1.5" stroke-linejoin="round"')

# ------------------------------------------------------------------ frutas

def maracuja():
    seeds = ''.join(e(32 + 9 * math.cos(math.radians(a)), 32 + 9 * math.sin(math.radians(a)), 2.2, 1.6, '#3B2A1A', a)
                    for a in range(0, 360, 51)) + e(32, 32, 2.2, 1.6, '#3B2A1A')
    return svg(c(32, 32, 27, '#E5B21E'), c(32, 32, 23, '#FFF4D6'), c(32, 32, 18, '#F4A21E'), seeds,
               p('M20 22c3-4 7-6 11-6', stroke='#FFD27A', w=2.5))

def mamao():
    seeds = ''.join(c(x, y, 2, '#2B2B2B') for x, y in [(30, 22), (34, 26), (29, 30), (34, 34), (30, 38), (33, 42)])
    return svg(g(e(32, 32, 19, 28, '#A9C23B') + e(32, 32, 16, 25, '#FF8A3D') +
                 p('M32 14c-6 6-8 16-6 24 1 5 3 8 6 8s5-3 6-8c2-8 0-18-6-24z', '#E8692A') + seeds,
                 'rotate(30 32 32)'))

def goiaba():
    seeds = ''.join(c(32 + 8 * math.cos(math.radians(a)), 35 + 8 * math.sin(math.radians(a)), 1.3, '#F9E79F')
                    for a in range(0, 360, 40))
    return svg(p('M32 12c0-3 2-5 4-6', stroke='#6B4F2A', w=2.5), leaf(36, 8, 65, 13, 7, '#5E9E3A', '#3F7A22'),
               c(32, 35, 24, '#9CC75B'), c(32, 35, 20, '#F7A6AE'), c(32, 35, 13, '#EF6F7F'), seeds,
               hl(20, 26, 3, 6))

def caqui():
    return svg(e(32, 38, 25, 21, '#F26B21'), hl(20, 32, 4, 8),
               poly(star_pts(32, 19, 12, 4.5, 4, -45), '#4E7D2B',
                    ' stroke="#4E7D2B" stroke-width="2" stroke-linejoin="round"'),
               c(32, 19, 3.2, '#3B5E20'), rr(30.5, 10, 3, 8, 1.5, '#5B3A1A'))

def acerola():
    berries = ''
    for x, y, r, col in [(32, 30, 11, '#C62828'), (19, 43, 12, '#E53935'), (45, 43, 12, '#D32F2F')]:
        berries += (c(x, y, r, col) + p(f'M{f(x - r * .45)} {f(y - r * .8)}Q{f(x - r * .3)} {f(y)} {f(x - r * .45)} {f(y + r * .8)}',
                                        stroke='#B71C1C', w=1.2, extra=' opacity=".6"') +
                    hl(x + r * .3, y - r * .4, r * .2, r * .35) + calyx(x, y - r + 1, 2.6, '#5E8C2E'))
    return svg(leaf(28, 21, -50, 14, 8, '#5E9E3A', '#3F7A22'), leaf(36, 21, 50, 14, 8, '#5E9E3A', '#3F7A22'), berries)

def pitaya():
    scales = ''
    for a in [-150, -115, -80, -45, -10, 25, 60, 120, 155, 190]:
        rad = math.radians(a)
        x, y = 32 + 17 * math.cos(rad), 37 + 21 * math.sin(rad)
        scales += leaf(x, y, a + 90, 11, 8, '#7CB342') + leaf(x, y, a + 90, 8, 7, '#F062A8')
    tuft = leaf(32, 18, -25, 12, 6, '#7CB342') + leaf(32, 18, 25, 12, 6, '#7CB342') + leaf(32, 18, 0, 14, 6, '#8BC34A')
    return svg(tuft, scales, e(32, 37, 18, 22, '#E8338B'),
               leaf(26, 32, -40, 9, 7, '#F062A8'), leaf(38, 42, 40, 9, 7, '#F062A8'), leaf(30, 50, 0, 8, 6, '#F062A8'),
               hl(24, 30, 3, 7))

def jabuticaba():
    berries = ''.join(c(x, y, 7.5, '#2B1A33') + hl(x - 2.5, y - 2.5, 1.6, 3)
                      for x, y in [(14, 44), (26, 40), (24, 52), (38, 32), (36, 44), (50, 22), (48, 34)])
    return svg(p('M4 58C20 46 40 30 60 10', stroke='#7A5230', w=5), berries)

def graviola():
    spikes = ''
    for i in range(-3, 4):
        for j in range(-4, 5):
            x, y = i * 5.5 + (2.7 if j % 2 else 0), j * 5.5
            if (x / 16) ** 2 + (y / 22) ** 2 < .8:
                rx = x * math.cos(math.radians(20)) - y * math.sin(math.radians(20))
                ry = x * math.sin(math.radians(20)) + y * math.cos(math.radians(20))
                spikes += c(32 + rx, 36 + ry, 1.3, '#3E6E22')
    return svg(p('M38 13c2-4 4-6 7-8', stroke='#4A3520', w=3), leaf(44, 7, 70, 14, 7, '#4E8F2E', '#2F5E1A'),
               e(32, 36, 19, 25, '#6DA544', 20), spikes, hl(24, 28, 3, 8, -10))

def carambola():
    return svg(poly(star_pts(32, 33, 26, 13), '#F4C430', ' stroke="#F4C430" stroke-width="5" stroke-linejoin="round"'),
               poly(star_pts(32, 33, 17, 8.5), '#FBE38E', ' stroke="#FBE38E" stroke-width="2" stroke-linejoin="round"'),
               ''.join(e(32 + 5 * math.cos(math.radians(a)), 33 + 5 * math.sin(math.radians(a)), 1.8, 1, '#C9A227', a)
                       for a in range(-90, 270, 72)))

def figo():
    seeds = ''.join(e(32 + r * math.cos(math.radians(a)), 41 + r * math.sin(math.radians(a)), 1.4, .8, '#F6D7A7', a)
                    for r in (6, 10) for a in range(0, 360, 45 if r == 6 else 30))
    return svg(rr(30, 2, 4, 8, 2, '#5B7F2A'),
               p('M32 7C26 15 12 28 12 40c0 11 9 18 20 18s20-7 20-18C52 28 38 15 32 7z', '#6A2C6E'),
               p('M32 14C27 21 17 31 17 40c0 8 7 13 15 13s15-5 15-13C47 31 37 21 32 14z', '#F28AA0'),
               e(32, 41, 7, 9, '#E2566F'), seeds)

def ameixa():
    return svg(p('M32 15c0-4 1-7 3-9', stroke='#5B3A1A', w=2.5), leaf(35, 9, 55, 14, 7, '#5E9E3A', '#3F7A22'),
               c(32, 37, 22, '#7B1E3B'), p('M32 16C26 27 26 47 32 58', stroke='#5A1229', w=2), hl(23, 29, 4, 8))

def limao_taiti():
    segs = ''.join(ln(24, 42, 24 + 11 * math.cos(math.radians(a)), 42 + 11 * math.sin(math.radians(a)), '#E8F5C8', 1.5)
                   for a in range(0, 360, 45))
    return svg(e(40, 26, 20, 15, '#4E9A2E', -20), hl(34, 20, 3, 6, -50),
               c(24, 42, 17, '#3F8A24'), c(24, 42, 14.5, '#E8F5C8'), c(24, 42, 13, '#B5D86A'), segs,
               c(24, 42, 2, '#E8F5C8'))

def caju():
    return svg(rr(30, 3, 4, 8, 2, '#5B3A1A'), leaf(34, 8, 65, 13, 7, '#5E9E3A', '#3F7A22'),
               p('M20 11h24c4 0 6 3 6 7 0 12-6 25-18 27C20 43 14 30 14 18c0-4 2-7 6-7z', '#F2552C'),
               hl(22, 22, 3, 8, -10),
               p('M22 48c-4 4-3 11 3 12 5 1 7-4 11-4s7 3 10-1c2-4-1-8-6-8-5 0-7 2-10 2s-5-4-8-1z', '#8D8B5A'))

def roma():
    return svg(p('M23 18l2-10 4 6 3-7 3 7 4-6 2 10z', '#A61F1F'), c(32, 38, 22, '#C62828'),
               p('M14 34c4-8 12-12 18-12', stroke='#E05858', w=2), hl(22, 30, 4, 8))

# ------------------------------------------------------------------ legumes

def chuchu():
    return svg(p('M29 11c0-3 1-6 3-7 2 1 3 4 3 7', '#5E8C2E'),
               p('M32 10c-6 0-9 5-11 10-6 3-11 9-11 18 0 12 10 20 22 20s22-8 22-20c0-9-5-15-11-18-2-5-5-10-11-10z', '#A8D46F'),
               p('M32 14c-1 12-1 28 0 42M23 22c-4 10-4 22 1 32M41 22c4 10 4 22-1 32', stroke='#7FB03F', w=2.5),
               e(18, 36, 3, 8, '#D2EBAA', extra=' opacity=".8"'))

def mandioca():
    return svg(g(p('M10 25C24 17 44 20 60 32 44 44 24 47 10 39z', '#8A5A33') +
                 p('M22 25c2 4 2 10 0 14M34 24c2 5 2 11 0 16M46 27c1 3 1 7 0 10', stroke='#6B4224', w=2) +
                 e(10, 32, 4.5, 7, '#F4EBD6', extra=' stroke="#6B4224" stroke-width="2"') + c(10, 32, 1.6, '#D9C79E'),
                 'rotate(-30 32 32)'))

def quiabo():
    return svg(g(rr(30.5, 3, 3, 9, 1.5, '#6B8E23') + p('M25 14C25 30 28 46 32 60 36 46 39 30 39 14z', '#5FA83A') +
                 p('M32 16v40M28.5 16c0 14 1 26 3 38M35.5 16c0 14-1 26-3 38', stroke='#3F7F22', w=1.8) +
                 p('M24 14c0-4 16-4 16 0 0 2-16 2-16 0z', '#3F7F22'), 'rotate(35 32 32)'))

def jilo():
    return svg(e(24, 38, 13, 16, '#6FA83A', -15), hl(19, 34, 2.5, 6, -15),
               e(42, 34, 12, 15, '#8BC34A', 15), hl(37, 30, 2.5, 6, 15),
               calyx(19.9, 23, 7, '#3E6B1F'), calyx(45.9, 20, 6.5, '#3E6B1F'))

def maxixe():
    spikes = ''
    for a in range(0, 360, 24):
        rad = math.radians(a)
        x, y = 15 * math.cos(rad), 20 * math.sin(rad)
        rx = x * math.cos(math.radians(20)) - y * math.sin(math.radians(20))
        ry = x * math.sin(math.radians(20)) + y * math.cos(math.radians(20))
        spikes += c(32 + rx, 36 + ry, 2.2, '#9CCC65')
    inner = ''.join(c(x, y, 1.4, '#7CB342') for x, y in [(28, 30), (36, 34), (30, 40), (38, 44), (26, 46), (34, 26)])
    return svg(p('M38.8 17c1-5 3-8 6-10', stroke='#4E7D2B', w=2.5), spikes, e(32, 36, 15, 20, '#B5DB80', 20), inner,
               hl(26, 32, 2.5, 6, 20))

def abobrinha():
    return svg(g(rr(-26, -9, 50, 18, 9, '#3D7A2A') +
                 p('M-20 -3H16M-20 3H16', stroke='#6FA84F', w=1.6, extra=' stroke-dasharray="4 3"') +
                 rr(21, -4.5, 9, 9, 3, '#7A8E3A') + hl(-12, -5, 8, 1.6, 0), 'translate(31 34) rotate(-35)'))

def beterraba():
    leaves = (leaf(28, 26, -28, 20, 11, '#3F8F3A', '#B0245C') + leaf(36, 26, 28, 20, 11, '#3F8F3A', '#B0245C') +
              leaf(32, 26, 0, 22, 11, '#4CA346', '#B0245C'))
    return svg(leaves, p('M32 58c0 3 1 4 3 5', stroke='#8E1B4A', w=2),
               p('M32 25c10 0 17 7 17 15 0 9-7 13-17 19-10-6-17-10-17-19 0-8 7-15 17-15z', '#8E1B4A'),
               hl(24, 36, 3, 6, -20))

def inhame():
    return svg(p('M12 40c0-11 9-19 20-21 11-2 21 4 21 15 0 12-10 21-21 21S12 51 12 40z', '#8D6E63'),
               p('M18 30c4 2 6 6 6 12M30 22c3 4 4 10 3 18M42 22c2 4 3 10 1 18', stroke='#6D4C41', w=1.8),
               p('M14 44l-4 2M20 52l-3 4M36 55l1 5M48 46l5 2M50 32l5-2', stroke='#6D4C41', w=1.4),
               hl(24, 32, 3, 6, -30, .2))

def batata_doce():
    return svg(g(p('M-26 0C-16-13 16-13 26 0 16 13-16 13-26 0z', '#8E3F6B') +
                 p('M-26 0h-4M26 0h4', stroke='#8E3F6B', w=2) +
                 p('M-10-7c2 3 2 11 0 14M6-8c2 4 2 12 0 16', stroke='#6E2C51', w=1.6) + hl(-6, -5, 7, 1.8, 0, .25),
                 'translate(32 32) rotate(-25)'))

def mandioquinha():
    def root(ang):
        body = (p('M-6 0C-6-5 6-5 6 0L1.5 26C.8 28.5-.8 28.5-1.5 26z', '#E8C872') +
                p('M-5 6h10M-4 12h8M-3 18h6', stroke='#C9A54E', w=1.2))
        return g(body, f'translate(32 16) rotate({ang})')
    return svg(leaf(30, 14, -20, 10, 6, '#5E9E3A'), leaf(34, 14, 20, 10, 6, '#5E9E3A'),
               root(30), root(-30), root(0))

def vagem():
    return svg(p('M8 52C18 32 34 18 54 10c-14 12-28 26-40 44z', '#5E9A33'),
               p('M14 56C24 38 40 24 58 18c-12 12-26 26-38 40z', '#6DAA3C'),
               p('M6 44C14 28 28 14 46 6c-12 10-24 24-34 40z', '#7CB342'),
               p('M12 46C20 34 30 24 42 16', stroke='#A5D46A', w=1.2))

def ervilha():
    peas = ''.join(c(x, y, 4.6, '#A5D46A') + hl(x - 1.5, y - 1.5, 1, 1.8)
                   for x, y in [(17, 37), (25, 34), (33, 31), (41, 28.5), (49, 26.5)])
    return svg(p('M6 40C16 22 40 16 58 20 48 40 26 48 6 40z', '#7CB342'),
               p('M10 39C20 26 38 22 54 23 44 36 26 42 10 39z', '#4E8A2A'), peas,
               p('M58 20l4-4', stroke='#6B8E23', w=2.5))

def abobora_cabotia():
    dots = ''.join(c(x, y, 1.1, '#8DB46A') for x, y in [(16, 36), (22, 46), (44, 34), (48, 46), (30, 30), (36, 48)])
    return svg(e(32, 39, 26, 19, '#3D6B35'), e(32, 39, 15, 19, '#4A7D40'), e(32, 39, 5, 19, '#3D6B35'), dots,
               p('M32 22c0-5 2-9 6-11', stroke='#7A5A3A', w=4))

def abobora_moranga():
    return svg(e(32, 39, 26, 19, '#E9781E'), e(32, 39, 15, 19, '#F28C28'), e(32, 39, 5, 19, '#E9781E'),
               hl(16, 34, 3, 7, -10, .3), p('M32 22c0-5 2-9 6-11', stroke='#5E7D2B', w=4))

def gengibre():
    body = (e(26, 38, 15, 10, '#D9A066') + e(42, 33, 12, 9, '#D9A066', -20) + e(36, 46, 9, 7, '#D9A066') +
            e(16, 29, 6, 5, '#D9A066', -30) + e(50, 23, 5, 6, '#D9A066', 20))
    ends = c(12, 26, 2.5, '#F2D3A0') + c(53, 18, 2.5, '#F2D3A0') + c(42, 51, 2.3, '#F2D3A0')
    rings = p('M22 32c2 4 2 9 0 13M32 31c2 4 2 9 0 13M44 27c2 3 2 8 0 11', stroke='#B07A43', w=1.5)
    return svg(body, ends, rings)

def rabanete():
    return svg(leaf(28, 28, -30, 20, 10, '#4CAF50', '#2E7D32'), leaf(36, 28, 30, 20, 10, '#4CAF50', '#2E7D32'),
               leaf(32, 28, 0, 22, 10, '#43A047', '#2E7D32'),
               p('M32 54c0 4 1 6 3 8', stroke='#F3C1CF', w=2), c(32, 41, 15, '#E0335E'),
               p('M27 54c2 2 8 2 10 0', '#F7F0F2'), hl(25, 35, 3, 6))

def cogumelo():
    return svg(rr(38, 30, 8, 16, 3, '#F3EADB'), p('M28 33c0-10 7-15 14-15s14 5 14 15z', '#D8C3A5'),
               rr(18, 38, 12, 20, 4, '#F5EFE6'), p('M6 41c0-13 9-20 18-20s18 7 18 20z', '#E6D5BC'),
               e(24, 41, 18, 3, '#C9B08C'), c(16, 32, 2, '#F3E9DA'), c(26, 28, 1.6, '#F3E9DA'), c(32, 34, 1.4, '#F3E9DA'))

# ------------------------------------------------------------------ verduras

def couve():
    return svg(p('M32 54C14 47 7 29 15 15 21 5 43 5 49 15c8 14 1 32-17 39z', '#2F7D32'),
               p('M32 62V12', stroke='#A5D6A7', w=3),
               p('M32 46 19 36M32 46l13-10M32 36 20 25M32 36l12-11M32 26l-7-9M32 26l7-9', stroke='#81C784', w=2))

def alface():
    return svg(c(32, 38, 23, '#7CB342'), c(20, 34, 13, '#9CCC65'), c(44, 34, 13, '#9CCC65'),
               c(32, 27, 14, '#AED581'), c(32, 44, 12, '#C5E1A5'),
               p('M32 32v22M24 40l8 6 8-6M22 30c3 2 6 6 8 10M42 30c-3 2-6 6-8 10', stroke='#7CB342', w=1.6))

def rucula():
    def lobed(x, y, ang, L):
        body = (leaf(0, 0, 0, L, 9, '#3E7D32', '#6FA86F') +
                leaf(0, -L * .35, -55, L * .35, 6, '#3E7D32') + leaf(0, -L * .35, 55, L * .35, 6, '#3E7D32') +
                leaf(0, -L * .6, -50, L * .28, 5, '#3E7D32') + leaf(0, -L * .6, 50, L * .28, 5, '#3E7D32'))
        return g(body, f'translate({x} {y}) rotate({ang})')
    return svg(lobed(32, 50, -32, 40), lobed(32, 50, 32, 40), lobed(32, 50, 0, 44),
               p('M32 50v10', stroke='#6FA86F', w=3), band(48))

def agriao():
    tips = [(14, 22), (22, 12), (34, 10), (46, 16), (52, 28)]
    stems = ''.join(stem_to(x, y, '#5D8F3A', 2) for x, y in tips)
    clusters = ''
    for x, y in tips:
        for dx, dy, col in [(-4, -2, '#4CAF50'), (4, -2, '#66BB6A'), (0, -6, '#4CAF50'), (-3, 4, '#66BB6A'), (3, 4, '#4CAF50')]:
            clusters += c(x + dx, y + dy, 3.6, col)
    return svg(stems, clusters, band(48))

def espinafre():
    leaves = ''
    for ang, L in [(-40, 34), (-14, 40), (14, 40), (40, 34)]:
        rad = math.radians(ang)
        bx, by = 32 + 14 * math.sin(rad), 50 - 14 * math.cos(rad)
        leaves += ln(32, 50, bx, by, '#7CB342', 2.2) + leaf(bx, by, ang, L - 14, 16, '#2E6B30', '#6FA86F')
    return svg(leaves, p('M32 50v10', stroke='#7CB342', w=3), band(48))

def repolho(outer='#81C784', mid='#A5D6A7', inner='#C8E6C9', vein='#66BB6A'):
    return svg(c(32, 36, 25, outer), c(32, 36, 19, mid), c(32, 34, 12, inner),
               p('M12 30c8 2 14 10 16 24M52 30c-8 2-14 10-16 24M22 16c4 6 6 14 6 20M42 16c-4 6-6 14-6 20',
                 stroke=vein, w=2),
               hl(24, 26, 3, 6, -30, .3))

def repolho_roxo():
    return repolho('#6C3483', '#8E44AD', '#B983D0', '#5B2C6F')

def couve_flor():
    curd = ''.join(c(x, y, r, '#F6F1E3') + c(x - r * .3, y - r * .3, r * .35, '#FFFFFF', ' opacity=".5"')
                   for x, y, r in [(20, 38, 8), (44, 38, 8), (24, 28, 9), (40, 28, 9), (32, 22, 9), (32, 36, 10)])
    return svg(leaf(22, 58, -50, 24, 14, '#4CAF50', '#2E7D32'), leaf(42, 58, 50, 24, 14, '#4CAF50', '#2E7D32'),
               leaf(32, 60, 0, 20, 26, '#43A047', '#2E7D32'), curd)

def acelga():
    return svg(e(32, 40, 13, 20, '#F1F5E6'),
               p('M18 36c-3-15 6-28 14-30 8 2 17 15 14 30-4-4-9-6-14-6s-10 2-14 6z', '#A5D46A'),
               p('M24 40c1 6 3 12 6 18M32 30v28M40 40c-1 6-3 12-6 18', stroke='#E0E8CF', w=2),
               p('M24 18c3 3 5 7 6 12M40 18c-3 3-5 7-6 12', stroke='#8BC34A', w=1.6))

# ------------------------------------------------------------------ temperos

def _sprig(x, y, col, L=9, W=7):
    return leaf(x, y, -45, L, W, col) + leaf(x, y, 45, L, W, col) + leaf(x, y, 0, L + 1, W, col)

def salsinha():
    tips = [(14, 22), (22, 12), (34, 10), (46, 14), (52, 24), (30, 26)]
    return svg(''.join(stem_to(x, y, '#5D8F3A') for x, y in tips),
               ''.join(_sprig(x, y, '#43A047') for x, y in tips), band())

def cebolinha():
    tops = [(16, 6), (24, 4), (32, 6), (40, 4), (48, 8)]
    greens = ''.join(p(f'M{f(32 + (x - 32) * .25)} 46Q{f((32 + x) / 2)} 26 {x} {y}', stroke=col, w=3.5)
                     for (x, y), col in zip(tops, ['#43A047', '#4CAF50', '#388E3C', '#4CAF50', '#43A047']))
    whites = ''.join(ln(32 + (x - 32) * .25, 46, 32 + (x - 32) * .2, 60, '#F1F8E9', 4) for x, _ in tops)
    return svg(greens, whites, band(44))

def cheiro_verde():
    tubes = ''.join(p(f'M{f(30 + (x - 20) * .2)} 46Q{f((30 + x) / 2)} 28 {x} {y}', stroke='#43A047', w=3.2)
                    for x, y in [(12, 8), (20, 6), (28, 8)])
    whites = ''.join(ln(30 + (x - 20) * .2, 46, 30 + (x - 20) * .15, 60, '#F1F8E9', 3.6) for x in (12, 20, 28))
    tips = [(38, 14), (46, 12), (54, 22), (42, 26)]
    sprigs = ''.join(p(f'M34 58Q{f((34 + x) / 2)} 44 {x} {y}', stroke='#5D8F3A', w=2) + _sprig(x, y, '#2E7D32')
                     for x, y in tips)
    return svg(tubes, whites, sprigs, band(46))

def coentro():
    tips = [(14, 22), (22, 12), (34, 10), (46, 14), (52, 26), (32, 26)]
    lobes = ''.join(c(x + dx, y + dy, 4, '#66BB6A') for x, y in tips for dx, dy in [(-4, 0), (4, 0), (0, -5)])
    return svg(''.join(stem_to(x, y, '#5D8F3A') for x, y in tips), lobes, band())

def manjericao():
    pairs = ''
    for y, L in [(46, 16), (34, 14), (22, 12)]:
        pairs += leaf(32, y, -60, L, 11, '#2E7D32', '#66BB6A') + leaf(32, y, 60, L, 11, '#2E7D32', '#66BB6A')
    return svg(ln(32, 60, 32, 12, '#558B2F', 3), pairs, leaf(32, 14, 0, 12, 9, '#388E3C', '#66BB6A'))

def hortela():
    def mint(x, y, ang, L):
        body = leaf(0, 0, 0, L, 12, '#4CAF50', '#2E7D32') + p(
            f'M0 {f(-L*.3)}l-3-2M0 {f(-L*.3)}l3-2M0 {f(-L*.55)}l-3-2M0 {f(-L*.55)}l3-2', stroke='#2E7D32', w=1)
        return g(body, f'translate({x} {y}) rotate({ang})')
    return svg(ln(32, 60, 32, 10, '#6D8F3A', 3), mint(32, 48, -65, 16), mint(32, 48, 65, 16),
               mint(32, 34, -60, 14), mint(32, 34, 60, 14), mint(32, 20, -45, 12), mint(32, 20, 45, 12),
               mint(32, 12, 0, 10))

def alecrim():
    def sprig(path_pts, ang):
        out = p('M0 0C2-14 2-30 0-44', stroke='#6D4C41', w=2)
        for i in range(10):
            y = -4 - i * 4
            out += ln(0, y, -6, y - 4, '#4E7D5B', 2) + ln(0, y, 6, y - 4, '#4E7D5B', 2)
        return g(out, f'translate({path_pts[0]} {path_pts[1]}) rotate({ang})')
    return svg(sprig((24, 58), -12), sprig((40, 58), 12))

def cebola_roxa():
    return svg(p('M32 14c0-4 1-7 3-9', stroke='#7A2E5A', w=3),
               p('M32 14c3 6 18 12 18 28 0 10-8 16-18 16S14 52 14 42c0-16 15-22 18-28z', '#8E3A6B'),
               p('M24 26c-4 6-5 14-3 24M40 26c4 6 5 14 3 24M32 18v38', stroke='#B0628E', w=1.6),
               p('M28 58l-2 4M32 58v5M36 58l2 4', stroke='#D7C4A3', w=1.5))

# ------------------------------------------------------------------ granja

def ovos_cartela():
    eggs = ''.join(e(x, y, 7, 8, '#F7E4C3') + hl(x - 2, y - 3, 1.4, 2.6) for y in (28, 40) for x in (17, 32, 47))
    return svg(rr(6, 22, 52, 32, 5, '#B88D60'), eggs, rr(6, 44, 52, 12, 4, '#C9A27A'),
               p('M12 50h40', stroke='#B88D60', w=1.5))

# ------------------------------------------------------------------ categorias

def cat_frutas():
    return svg(c(22, 28, 10, '#F28C28'), hl(19, 24, 2, 4),
               c(42, 28, 10, '#E53935'), leaf(42, 18, 30, 8, 5, '#5E9E3A'),
               p('M14 22C22 10 40 10 50 22c-10-6-26-6-36 0z', '#F6C744'),
               p('M8 34h48l-6 22H14z', '#B5793F'),
               p('M12 42h40M14 49h36M24 36l2 20M40 36l-2 20', stroke='#8E5A2B', w=1.5),
               rr(6, 31, 52, 6, 3, '#C68B4E'))

def cat_legumes():
    return svg(leaf(18, 20, -15, 12, 6, '#5E9E3A'), leaf(20, 20, 15, 12, 6, '#5E9E3A'),
               p('M14 22h10l-5 18z', '#F28C28'),
               e(34, 28, 8, 12, '#6A2C8E', 20), p('M37 17c2-3 4-4 6-4', stroke='#4E7D2B', w=3),
               c(48, 30, 8, '#E53935'), calyx(48, 23, 4, '#4E7D2B'),
               rr(8, 34, 48, 22, 3, '#C68B4E'),
               p('M8 41h48M8 48h48', stroke='#9A6634', w=1.6), p('M14 34v22M50 34v22', stroke='#9A6634', w=2))

def cat_verduras():
    return svg(leaf(32, 40, -40, 30, 18, '#43A047', '#A5D6A7'), leaf(32, 40, 40, 30, 18, '#43A047', '#A5D6A7'),
               leaf(32, 40, 0, 34, 20, '#2E7D32', '#A5D6A7'),
               rr(10, 38, 44, 20, 3, '#C68B4E'), p('M10 45h44M10 51h44', stroke='#9A6634', w=1.6))

def cat_temperos():
    return svg(leaf(32, 30, -45, 18, 10, '#43A047', '#2E7D32'), leaf(32, 30, 45, 18, 10, '#43A047', '#2E7D32'),
               leaf(32, 30, 0, 22, 10, '#388E3C', '#2E7D32'), leaf(32, 30, -80, 14, 8, '#4CAF50'),
               leaf(32, 30, 80, 14, 8, '#4CAF50'),
               p('M16 36h32l-4 22H20z', '#C8643B'), rr(13, 31, 38, 7, 3, '#D9774C'))

def cat_granja():
    return svg(e(21, 28, 8, 10, '#F7E4C3'), e(43, 28, 8, 10, '#EBD3AE'), e(32, 25, 8, 10, '#FBF3E4'),
               hl(29, 21, 1.6, 3),
               p('M8 36c0 12 10 20 24 20s24-8 24-20z', '#8D6E63'),
               p('M10 40c8 4 36 4 44 0M14 47c8 3 28 3 36 0', stroke='#6D4C41', w=1.6),
               e(32, 36, 24, 4, '#A1887F'))

def cat_mercearia():
    return svg(g(rr(-3, -16, 6, 30, 3, '#E0A458') + p('M-1-10l2-2M-1-4l2-2M-1 2l2-2', stroke='#C68642', w=1.2),
                 'translate(22 26) rotate(-18)'),
               rr(36, 10, 8, 6, 1, '#2E7D32'), rr(34, 14, 12, 20, 3, '#4CAF50'), leaf(30, 22, 10, 10, 6, '#7CB342'),
               p('M12 26h40l-4 32H16z', '#D9B48A'), p('M12 26h40l-2 5H14z', '#C69C6D'),
               p('M24 38h16', stroke='#B88A5A', w=2))

def cat_mercadinho():
    stripes = ''.join(rr(10 + i * 7.33, 16, 7.33, 10, 0, '#E53935' if i % 2 == 0 else '#FFFFFF') for i in range(6))
    scallops = ''.join(c(13.7 + i * 7.33, 26, 3.7, '#E53935' if i % 2 == 0 else '#F2F2F2') for i in range(6))
    return svg(rr(10, 24, 44, 34, 2, '#ECE3D2'), rr(8, 11, 48, 6, 2, '#B5793F'), stripes, scallops,
               rr(14, 36, 10, 10, 1, '#9ED3E6'), rr(40, 36, 10, 10, 1, '#9ED3E6'),
               rr(27, 38, 10, 20, 1, '#7A5A3A'), c(34.5, 48, 1, '#F6C744'), rr(6, 56, 52, 3, 1, '#9E9E9E'))

def cat_laticinios():
    return svg(poly(['12,20', '22,10', '32,20'], '#D7E3F4'), rr(12, 20, 20, 36, 2, '#F5F7FA'),
               rr(12, 32, 20, 10, 0, '#4A90D9'), rr(19, 6, 6, 6, 1, '#4A90D9'),
               poly(['34,56', '58,56', '58,40'], '#F6C744'), poly(['34,56', '58,40', '58,36', '34,52'], '#F9D86A'),
               c(48, 51, 2, '#E0A82E'), c(54, 47, 1.6, '#E0A82E'), c(42, 54, 1.3, '#E0A82E'))

def cat_padaria():
    return svg(g(rr(-26, -5, 52, 10, 5, '#E0A458') + p('M-14-3l3 6M-4-3l3 6M6-3l3 6M16-3l3 6', stroke='#F2C38A', w=1.6),
                 'translate(34 24) rotate(-20)'),
               e(30, 42, 22, 14, '#C9803A'), p('M18 36l6 8M28 34l6 8M38 34l6 8', stroke='#F2C38A', w=2.2),
               hl(20, 36, 4, 2, -10, .25))

def cat_bebidas():
    return svg(p('M18 6h8v8c4 2 6 6 6 10v30a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V24c0-4 2-8 6-10z', '#3FA34D'),
               rr(17, 2, 10, 6, 1, '#2E7D32'), rr(12, 30, 20, 12, 0, '#F5F7FA'),
               p('M38 30h18l-3 28H41z', '#CDE9F6'), p('M39 38h16l-2 20H41z', '#F6A623'),
               p('M50 22l-4 28', stroke='#E53935', w=2), hl(42, 44, 1.2, 4, 5, .4))

def cat_limpeza():
    bubbles = c(50, 16, 4, 'none', ' stroke="#81D4FA" stroke-width="2"') + c(56, 26, 2.6, 'none', ' stroke="#81D4FA" stroke-width="2"') + c(48, 28, 2, 'none', ' stroke="#81D4FA" stroke-width="2"')
    return svg(p('M18 10h20l4 8H30v6H22v-6h-4z', '#1E88E5'), rr(38, 11, 6, 4, 1, '#1565C0'),
               rr(20, 24, 14, 6, 2, '#1E88E5'), rr(16, 28, 22, 30, 5, '#4FC3F7'), rr(20, 36, 14, 12, 2, '#E1F5FE'),
               bubbles)

def cat_congelados():
    arms = ''
    for a in range(0, 360, 60):
        arms += g(ln(0, 0, 0, -20, '#4FA3E0', 3.2) + ln(0, -12, -5, -17, '#4FA3E0', 2.4) + ln(0, -12, 5, -17, '#4FA3E0', 2.4),
                  f'translate(32 32) rotate({a})')
    return svg(c(32, 32, 28, '#E3F2FD'), arms, c(32, 32, 3, '#4FA3E0'))

def cat_acougue():
    return svg(p('M14 22c8-12 28-14 38-4 8 8 4 22-6 28-10 6-26 8-32-2-4-6-4-14 0-22z', '#F6D3C6'),
               p('M18 24c7-9 24-11 32-3 6 6 3 18-5 22-9 5-22 6-27-1-3-5-3-12 0-18z', '#D9534F'),
               c(30, 34, 5, '#F7F1EA'), c(30, 34, 2.2, '#E8DCCB'),
               p('M38 26c3 2 5 5 5 9', stroke='#F2A39F', w=1.6))

def cat_promocao():
    return svg(g(p('M-16-22h22l14 14v30a4 4 0 0 1-4 4h-28a4 4 0 0 1-4-4v-40a4 4 0 0 1 4-4z', '#F2994A') +
                 c(-8, -14, 3.4, '#FFFFFF') +
                 c(-6, 2, 3.4, 'none', ' stroke="#FFFFFF" stroke-width="2.4"') +
                 c(8, 16, 3.4, 'none', ' stroke="#FFFFFF" stroke-width="2.4"') +
                 ln(9, 0, -7, 18, '#FFFFFF', 2.6), 'translate(30 34) rotate(-15)'))

def cat_organicos():
    return svg(c(32, 32, 27, '#E8F5E9'), c(32, 32, 27, 'none', ' stroke="#43A047" stroke-width="3"'),
               leaf(26, 46, 35, 30, 20, '#43A047', '#A5D6A7'), p('M20 50l6-4', stroke='#2E7D32', w=2.5))

def cat_outros():
    return svg(poly(['10,22', '32,12', '54,22', '32,32'], '#E2C49B'), poly(['10,22', '32,32', '32,58', '10,48'], '#C9A27A'),
               poly(['54,22', '32,32', '32,58', '54,48'], '#B88D60'), poly(['19,18', '41,28', '45,26', '23,16'], '#F2E2C4'))

def cat_combo():
    return svg(c(22, 38, 14, '#E53935'), hl(17, 32, 2.5, 5), c(42, 38, 14, '#F28C28'), hl(37, 32, 2.5, 5),
               rr(29, 24, 6, 32, 2, '#8E44AD'),
               e(25, 20, 7, 4.5, '#9B59B6', -25), e(39, 20, 7, 4.5, '#9B59B6', 25), c(32, 21, 3.5, '#7D3C98'))


# ------------------------------------------------------------------ itens do fornecedor real (v2)

def tamara():
    out = ''
    for x, y, rot in [(20, 36, -30), (34, 30, 10), (44, 42, 40)]:
        out += e(x, y, 8, 15, '#7B4A2A', rot) + p(f'M{x-3} {y-6}c2 3 2 8 0 12', stroke='#5E3720', w=1.4) + hl(x - 2, y - 6, 1.5, 4, rot)
    return svg(out)

def caja():
    out = p('M32 6c0 6-6 10-12 14M32 6c0 6 6 10 12 14M32 6v12', stroke='#6B8E23', w=2)
    for x, y in [(20, 32), (44, 32), (32, 44)]:
        out += e(x, y, 10, 13, '#F2B01E') + hl(x - 3, y - 4, 2, 4)
    return svg(out)

def lichia():
    bumps = ''.join(c(22 + 13 * math.cos(math.radians(a)) * r, 38 + 13 * math.sin(math.radians(a)) * r, 1.4, '#A82838')
                    for r in (.4, .75) for a in range(0, 360, 40 if r == .4 else 25))
    return svg(p('M22 20c2-6 6-10 12-12', stroke='#6B8E23', w=2.2), leaf(34, 9, 70, 12, 6, '#5E9E3A'),
               c(22, 38, 15, '#D2384A'), bumps, hl(16, 32, 2.5, 5),
               c(45, 42, 12, '#C04A50'), c(45, 42, 9.5, '#F4F1EA'), e(45, 42, 3, 4.5, '#8B5A3C'), hl(41, 38, 2, 3, -30, .6))

def chicoria():
    def frilly(x, y, ang, L, col):
        body = leaf(0, 0, 0, L, 8, col)
        for i, t in enumerate((.3, .45, .6, .75)):
            side = -1 if i % 2 else 1
            body += leaf(0, -L * t, 50 * side, L * .3, 5, col) + leaf(0, -L * t, -50 * side, L * .25, 4, col)
        return g(body, f'translate({x} {y}) rotate({ang})')
    return svg(frilly(32, 54, -40, 40, '#7CB342'), frilly(32, 54, 40, 40, '#7CB342'),
               frilly(32, 54, -15, 44, '#9CCC65'), frilly(32, 54, 15, 44, '#9CCC65'), frilly(32, 54, 0, 38, '#DCE775'),
               p('M32 54v8', stroke='#C5E1A5', w=4))

def louro():
    out = p('M14 58C22 44 34 28 52 8', stroke='#7A5A3A', w=2.5)
    for x, y, ang in [(20, 49, -70), (24, 43, 25), (30, 35, -60), (34, 30, 35), (40, 22, -45), (45, 17, 45), (51, 9, 30)]:
        out += leaf(x, y, ang, 15, 7, '#5B7F3A', '#8DA868')
    return svg(out)

def pimentas():
    return svg(p('M30 12c2-4 5-6 8-6', stroke='#4E7D2B', w=2.5), calyx(29, 15, 4, '#4E7D2B'),
               p('M26 16c-6 6-10 20-6 34 1 4 4 4 5 0 3-10 6-22 8-30z', '#E53935'),
               p('M42 22c2-4 4-6 7-6', stroke='#4E7D2B', w=2.5), calyx(41, 24, 3.5, '#4E7D2B'),
               p('M38 25c-4 6-5 16-2 26 1 3 3 3 4 0 2-8 4-18 4-24z', '#FBC02D'), hl(24, 26, 1.2, 6, 10, .4))

def suco_garrafa():
    return svg(rr(25, 4, 14, 7, 2, '#43A047'), p('M26 11h12v6c5 3 8 7 8 12v25a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V29c0-5 3-9 8-12z', '#E3F2FD'),
               p('M19 30h26v24a5 5 0 0 1-5 5H24a5 5 0 0 1-5-5z', '#FFA726'), rr(19, 36, 26, 13, 0, '#FFFFFF', ' opacity=".85"'),
               c(32, 42.5, 4.5, '#FB8C00'), leaf(34, 38.5, 40, 5, 3, '#43A047'), hl(22, 24, 1.4, 5, 0, .6))

def salada_de_frutas():
    cubes = (rr(19, 32, 8, 8, 1.5, '#F2C94C') + rr(29, 30, 8, 8, 1.5, '#E53935') + rr(39, 32, 7, 7, 1.5, '#7CB342') +
             rr(22, 41, 8, 8, 1.5, '#FF8A3D') + rr(33, 40, 8, 8, 1.5, '#F2C94C') + c(43, 45, 3.5, '#6A1B9A'))
    return svg(rr(12, 18, 40, 7, 3, '#B3E5FC'), p('M15 26h34l-4 32a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3z', '#E3F2FD'), cubes,
               p('M15 26h34', stroke='#90CAF9', w=2))

def legumes_picados():
    cubes = (rr(14, 30, 8, 8, 1.5, '#F28C28') + rr(24, 28, 8, 8, 1.5, '#7CB342') + rr(34, 30, 8, 8, 1.5, '#F6E27F') +
             rr(43, 29, 7, 7, 1.5, '#F28C28') + rr(18, 38, 8, 7, 1.5, '#A5D46A') + rr(29, 37, 8, 8, 1.5, '#F28C28') +
             rr(39, 38, 8, 7, 1.5, '#7CB342'))
    return svg(cubes, p('M8 36h48l-4 18a4 4 0 0 1-4 3H16a4 4 0 0 1-4-3z', '#ECEFF1'), p('M8 36h48', stroke='#B0BEC5', w=2.5),
               rr(16, 44, 32, 6, 2, '#CFD8DC'))

def acucar():
    return svg(p('M14 14h28l4 6v38H10V20z', '#FAFAFA'), p('M14 14h28l4 6H10z', '#E0E0E0'),
               rr(10, 28, 36, 14, 0, '#1E88E5'), rr(16, 32, 24, 6, 2, '#FFFFFF'),
               rr(42, 44, 10, 10, 2, '#FFFFFF', ' stroke="#BDBDBD" stroke-width="1.5"'),
               rr(48, 36, 9, 9, 2, '#FFFFFF', ' stroke="#BDBDBD" stroke-width="1.5"'))

def farinha():
    wheat = ln(32, 52, 32, 30, '#C9A227', 2) + ''.join(leaf(32, y, a, 7, 4, '#E0B84A') for y in (36, 41, 46) for a in (-35, 35)) + leaf(32, 31, 0, 7, 4, '#E0B84A')
    return svg(p('M18 12c4 2 24 2 28 0l-2 8c6 6 8 14 8 24 0 10-6 16-20 16S12 54 12 44c0-10 2-18 8-24z', '#EBDDC3'),
               p('M20 20c6 2 18 2 24 0', stroke='#C9B48A', w=2), p('M18 12c4 2 24 2 28 0', stroke='#C9B48A', w=2.5), wheat)

def sabao_em_po():
    bubbles = ''.join(c(x, y, r, 'none', ' stroke="#81D4FA" stroke-width="2"') for x, y, r in [(46, 10, 4), (54, 18, 3), (40, 6, 2.2)])
    return svg(rr(12, 20, 34, 38, 3, '#1E88E5'), poly(['12,20', '18,12', '52,12', '46,20'], '#64B5F6'),
               poly(['46,20', '52,12', '52,50', '46,58'], '#1565C0'), c(29, 39, 9, '#FFFFFF'), c(29, 39, 6, '#4FC3F7'),
               c(26, 36, 1.6, '#FFFFFF'), bubbles)

def inseticida():
    mist = ''.join(c(x, y, 1.3, '#BDBDBD') for x, y in [(44, 10), (49, 8), (47, 14), (53, 12), (52, 17), (57, 10)])
    return svg(rr(22, 6, 10, 6, 2, '#424242'), rr(32, 7, 6, 3, 1, '#424242'), mist,
               rr(18, 12, 18, 6, 2, '#9E9E9E'), rr(16, 18, 22, 40, 5, '#F2B01E'), rr(16, 28, 22, 16, 0, '#E53935'),
               e(27, 36, 4, 2.5, '#212121'), p('M23 34l-3-3M31 34l3-3M23 38l-3 3M31 38l3 3', stroke='#212121', w=1.2))

def oleo():
    return svg(rr(26, 4, 12, 6, 2, '#C62828'), rr(28, 10, 8, 6, 1, '#FFF59D'),
               p('M28 16h8c6 4 10 10 10 18v20a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V34c0-8 4-14 10-18z', '#FDD835'),
               rr(18, 34, 28, 12, 0, '#FFFFFF', ' opacity=".9"'), leaf(32, 44, 0, 8, 6, '#7CB342'), hl(23, 28, 1.6, 6, 0, .5))


# ------------------------------------------------------------------ itens comuns (substituem os emojis no site)

APPLE = 'M32 20c-4-4-10-5-15-2-8 5-9 17-5 27 4 9 10 14 15 13 2 0 3-1 5-1s3 1 5 1c5 1 11-4 15-13 4-10 3-22-5-27-5-3-11-2-15 2z'

def banana():
    def one(col, dx, dy):
        return g(p('M10 20c3 20 18 32 40 32 4 0 6-3 3-5-20-2-31-14-35-29-1-4-8-3-8 2z', col) +
                 p('M10 20l-2-6', stroke='#6D4C41', w=3) + c(52, 49, 1.8, '#6D4C41'), f'translate({dx} {dy})')
    return svg(one('#F2B01E', 2, -6), one('#F6C744', 0, 2), one('#FBD96B', -2, 10))

def _apple(col):
    return svg(p('M32 21c0-5 2-9 5-12', stroke='#6D4C41', w=3), leaf(36, 12, 60, 13, 7, '#5E9E3A', '#3F7A22'),
               p(APPLE, col), hl(20, 32, 3.5, 7))

def maca(): return _apple('#E53935')
def maca_verde(): return _apple('#8BC34A')

def pera():
    return svg(p('M32 13c0-4 1-6 3-8', stroke='#6D4C41', w=3), leaf(35, 8, 60, 11, 6, '#5E9E3A'),
               p('M32 12c-4 0-6 4-6 9 0 5-8 9-10 18-3 12 6 21 16 21s19-9 16-21c-2-9-10-13-10-18 0-5-2-9-6-9z', '#C0CA33'),
               hl(22, 40, 3, 7))

def uva():
    grapes = ''.join(c(x, y, 7, '#7B3F99') + hl(x - 2, y - 2, 1.4, 2.6)
                     for x, y in [(20, 22), (32, 22), (44, 22), (26, 33), (38, 33), (32, 44), (32, 55)])
    return svg(p('M32 15c0-5 3-9 7-11', stroke='#6D4C41', w=3), leaf(40, 6, 75, 14, 9, '#5E9E3A', '#3F7A22'), grapes)

def laranja():
    dots = ''.join(c(x, y, .9, '#E07B1A') for x, y in [(22, 30), (30, 26), (40, 30), (24, 42), (36, 46), (44, 40), (32, 36)])
    return svg(c(32, 37, 23, '#F28C28'), dots, hl(21, 28, 3.5, 7), p('M32 14v-4', stroke='#6D4C41', w=3),
               leaf(33, 11, 55, 14, 8, '#43A047', '#2E7D32'))

def mexerica():
    dots = ''.join(c(x, y, .9, '#D96A00') for x, y in [(18, 36), (26, 30), (38, 30), (46, 38), (30, 44), (40, 46), (22, 46)])
    return svg(p('M8 38c0-12 10-18 24-18s24 6 24 18-10 18-24 18S8 50 8 38z', '#F57C00'), dots,
               e(32, 21, 6, 2.5, '#E06A00'), hl(17, 33, 3, 5, -40), c(32, 20, 2.2, '#5E8C2E'), leaf(34, 19, 60, 13, 7, '#43A047', '#2E7D32'))

def limao_siciliano():
    return svg(g(e(0, 0, 22, 16, '#F6D743') + e(-22, 0, 4, 3, '#F6D743') + e(22, 0, 4, 3, '#F6D743') + hl(-8, -6, 6, 2.5, 0),
                 'translate(32 34) rotate(-25)'), leaf(44, 18, 50, 14, 8, '#43A047', '#2E7D32'))

def melancia():
    seeds = ''.join(e(x, y, 1.2, 2, '#212121') for x, y in [(20, 30), (32, 28), (44, 30), (26, 38), (38, 38), (32, 46)])
    return svg(p('M4 22h56c0 20-12 34-28 34S4 42 4 22z', '#2E7D32'), p('M8 22h48c0 17-10 29-24 29S8 39 8 22z', '#C5E1A5'),
               p('M11 22h42c0 15-9 26-21 26S11 37 11 22z', '#E53935'), seeds)

def melao():
    return svg(e(32, 36, 26, 20, '#F2D66B'), p('M10 30c10 4 34 4 44 0M8 38c12 4 36 4 48 0M12 46c10 3 30 3 40 0', stroke='#E0BE45', w=1.5),
               hl(18, 28, 4, 7, -50), p('M55 33c2-2 3-4 4-6', stroke='#5E8C2E', w=3), leaf(57, 27, 20, 8, 5, '#43A047'))

def abacaxi():
    crown = ''.join(leaf(32, 24, a, L, 7, col) for a, L, col in
                    [(-40, 16, '#2E7D32'), (40, 16, '#2E7D32'), (-18, 20, '#43A047'), (18, 20, '#43A047'), (0, 22, '#388E3C')])
    lattice = p('M16 34l22 22M16 46l12 12M22 26l26 26M34 24l16 16M48 26L22 56M50 38L36 54M40 24L16 48M28 25L16 37', stroke='#C9822A', w=1.5)
    return svg(crown, e(32, 42, 17, 19, '#E8A33D'), lattice)

def morango():
    seeds = ''.join(e(x, y, .9, 1.5, '#FFE082') for x, y in [(22, 26), (32, 25), (42, 26), (26, 35), (38, 35), (32, 44), (27, 50), (37, 50)])
    return svg(p('M32 58C18 50 10 38 12 28c1-7 8-10 20-10s19 3 20 10c2 10-6 22-20 30z', '#E53935'), seeds,
               poly(star_pts(32, 18, 13, 5, 5, -90), '#43A047', ' stroke="#43A047" stroke-width="2" stroke-linejoin="round"'),
               rr(30.5, 5, 3, 8, 1.5, '#2E7D32'), hl(20, 30, 2.5, 6))

def manga():
    return svg(g(e(0, 0, 18, 24, '#F2B233') + e(6, -10, 11, 12, '#E8603C', extra=' opacity=".75"') + hl(-8, 4, 3, 7, 0),
                 'translate(32 36) rotate(35)'), p('M42 14c2-4 4-6 7-7', stroke='#6D4C41', w=3), leaf(48, 8, 70, 13, 7, '#43A047', '#2E7D32'))

def abacate():
    shape = 'M32 6c-7 0-10 8-12 15-6 6-10 14-10 22 0 10 9 17 22 17s22-7 22-17c0-8-4-16-10-22-2-7-5-15-12-15z'
    inner = 'M32 12c-5 0-7 6-9 12-5 5-8 12-8 19 0 7 7 12 17 12s17-5 17-12c0-7-3-14-8-19-2-6-4-12-9-12z'
    return svg(p(shape, '#33691E'), p(inner, '#D4E79E'), c(32, 41, 9, '#8D5A35'), hl(29, 38, 2, 3.5, -30, .4))

def kiwi():
    seeds = ''.join(e(32 + 11 * math.cos(math.radians(a)), 32 + 11 * math.sin(math.radians(a)), .9, 2, '#212121', a + 90)
                    for a in range(0, 360, 24))
    return svg(c(32, 32, 26, '#8D6E63'), c(32, 32, 23, '#7CB342'), c(32, 32, 16, '#9CCC65'), seeds, c(32, 32, 6, '#F1F8E9'))

def coco():
    return svg(c(32, 36, 24, '#6D4C41'), c(32, 36, 20, '#F5F5F5'), c(32, 36, 15, '#E0E0E0', ' opacity=".5"'),
               p('M14 22c4-6 10-10 18-10', stroke='#8D6E63', w=2), hl(22, 30, 3, 6, -30, .5))

def pessego():
    return svg(c(32, 37, 22, '#F6A97A'), e(40, 34, 12, 14, '#EF7D5F', 20, ' opacity=".8"'),
               p('M32 16C27 26 27 46 32 58', stroke='#E57357', w=2), p('M32 16c0-4 1-7 3-9', stroke='#6D4C41', w=2.5),
               leaf(35, 10, 60, 13, 7, '#5E9E3A', '#3F7A22'), hl(22, 30, 3, 6))

def cereja():
    return svg(p('M20 42C24 26 32 14 44 6M44 42C42 28 42 16 44 6', stroke='#5D4037', w=2.2), leaf(44, 7, 60, 14, 7, '#43A047', '#2E7D32'),
               c(20, 46, 11, '#C62828'), hl(16, 42, 2, 3.5), c(44, 46, 11, '#D32F2F'), hl(40, 42, 2, 3.5))

def mirtilo():
    def berry(x, y, r):
        return (c(x, y, r, '#3F51B5') + poly(star_pts(x, y - r * .45, r * .35, r * .15, 5), '#283593') +
                hl(x - r * .4, y + r * .1, r * .15, r * .3))
    return svg(berry(22, 40, 11), berry(42, 40, 11), berry(32, 24, 10))

def _tomato(col='#E53935', cx=32, cy=36, r=22):
    return (e(cx, cy, r, r * .88, col) + hl(cx - r * .45, cy - r * .3, r * .15, r * .3) +
            poly(star_pts(cx, cy - r * .8, r * .5, r * .2, 5), '#43A047', ' stroke="#43A047" stroke-width="1.5" stroke-linejoin="round"') +
            c(cx, cy - r * .8, r * .12, '#2E7D32'))

def tomate(): return svg(_tomato())

def tomate_cereja():
    return svg(p('M8 14C20 10 36 12 56 20', stroke='#2E7D32', w=2.5), _tomato('#E53935', 18, 34, 10), _tomato('#D32F2F', 36, 30, 10),
               _tomato('#EF5350', 28, 50, 9), _tomato('#E53935', 48, 46, 9))

def batata():
    eyes = ''.join(c(x, y, 1.2, '#9C7A45') for x, y in [(20, 32), (30, 26), (42, 34), (26, 42), (38, 44)])
    return svg(p('M10 36c0-12 10-18 22-18 14 0 24 6 24 16 0 12-10 18-24 18S10 46 10 36z', '#C8A165'), eyes, hl(20, 28, 5, 2.5, -15, .3))

def cenoura():
    return svg(leaf(30, 18, -30, 14, 7, '#43A047'), leaf(34, 18, 30, 14, 7, '#43A047'), leaf(32, 18, 0, 16, 7, '#388E3C'),
               p('M22 18h20c0 14-4 30-10 42-6-12-10-28-10-42z', '#F28C28'), p('M26 26h6M30 34h6M28 42h5M31 50h3', stroke='#D9721A', w=1.6))

def cebola():
    return svg(p('M32 14c0-4 1-7 3-9', stroke='#8D6E63', w=3),
               p('M32 14c3 6 18 12 18 28 0 10-8 16-18 16S14 52 14 42c0-16 15-22 18-28z', '#E0A040'),
               p('M24 26c-4 6-5 14-3 24M40 26c4 6 5 14 3 24M32 18v38', stroke='#F2C27A', w=1.6),
               p('M28 58l-2 4M32 58v5M36 58l2 4', stroke='#D7C4A3', w=1.5))

def alho():
    return svg(p('M32 8c2 4 2 8 1 12', stroke='#D9CBB5', w=3),
               p('M32 18c10 2 22 10 22 22 0 12-10 18-22 18S10 52 10 40c0-12 12-20 22-22z', '#F3EDE3'),
               p('M20 26c-4 8-4 18 2 28M32 20v36M44 26c4 8 4 18-2 28', stroke='#D9CBB5', w=1.8),
               p('M24 58l-2 4M32 58v5M40 58l2 4', stroke='#BCAAA4', w=1.5))

def berinjela():
    return svg(g(p('M0-14c10 0 14 10 14 24 0 14-6 22-14 22S-14 24-14 10c0-14 4-24 14-24z', '#5E2A84') + hl(-6, 2, 2.5, 9, 0, .25),
                 'translate(30 32) rotate(-30)'),
               poly(star_pts(38, 18, 10, 4, 4, -45), '#43A047', ' stroke="#43A047" stroke-width="2" stroke-linejoin="round"'),
               p('M40 14c2-4 4-6 7-7', stroke='#2E7D32', w=3))

def pepino():
    bumps = ''.join(c(x, y, 1.1, '#A5D46A') for x, y in [(-16, -3), (-8, 3), (0, -3), (8, 3), (16, -3)])
    return svg(g(rr(-26, -8, 52, 16, 8, '#43A047') + bumps + rr(22, -3, 6, 6, 2, '#2E7D32') + hl(-12, -4.5, 8, 1.5, 0),
                 'translate(32 34) rotate(-35)'))

def _pepper(col):
    return svg(p('M32 16c0-5 3-9 7-10', stroke='#2E7D32', w=3.5),
               p('M32 16c-12-4-22 4-20 18 2 14 8 22 14 22 3 0 4-2 6-2s3 2 6 2c6 0 12-8 14-22 2-14-8-22-20-18z', col),
               p('M32 18c-3 10-3 26 0 36', stroke='#000000', w=1.5, extra=' opacity=".15"'), hl(20, 30, 2.5, 7))

def pimentao(): return _pepper('#43A047')
def pimentao_colorido(): return _pepper('#E53935')

def milho():
    kernels = ''.join(rr(x - 2.5, y - 2.5, 5, 5, 1.5, '#F6C744') for x in (26, 32, 38) for y in range(14, 50, 6))
    return svg(e(32, 32, 12, 24, '#F2B01E'), kernels,
               p('M32 60C18 54 14 40 16 26c4 10 10 20 16 34z', '#7CB342'), p('M32 60c14-6 18-20 16-34-4 10-10 20-16 34z', '#8BC34A'))

def brocolis():
    return svg(p('M26 60l2-20h8l2 20z', '#9CCC65'), p('M30 44l-8-8M34 44l8-8', stroke='#9CCC65', w=4),
               c(18, 30, 10, '#2E7D32'), c(46, 30, 10, '#2E7D32'), c(32, 22, 12, '#388E3C'), c(26, 34, 9, '#43A047'), c(38, 34, 9, '#43A047'),
               c(28, 18, 3, '#66BB6A'), c(16, 26, 2.5, '#66BB6A'))

def mel():
    return svg(rr(18, 10, 28, 7, 2, '#8D6E63'), p('M16 18h32v34a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z', '#F2A93B'),
               rr(16, 30, 32, 12, 0, '#FFF3D6'), '<polygon points="32,31 36.3,33.5 36.3,38.5 32,41 27.7,38.5 27.7,33.5" fill="#F2A93B"/>',
               hl(21, 48, 1.4, 4, 0, .4))

# ------------------------------------------------------------------ mercearia, bebidas, limpeza, higiene

def cafe():
    return svg(p('M14 12h36l-2 46H16z', '#6D4C41'), p('M14 12h36l-2 6H16z', '#4E342E'),
               e(32, 36, 8, 11, '#3E2723', -20), p('M28 28c4 4 4 12 0 16', stroke='#8D6E63', w=1.6))

def arroz():
    grains = ''.join(e(x, y, 1.4, 3, '#FFFFFF', 20) for x, y in [(24, 44), (30, 46), (36, 44), (42, 46), (27, 50), (33, 51), (39, 50)])
    return svg(p('M14 10h36l2 48H12z', '#F5F5F5'), rr(12, 20, 40, 12, 0, '#2E7D32'), rr(18, 23, 28, 6, 2, '#FFFFFF'),
               rr(16, 38, 32, 18, 3, '#E0E0E0'), grains)

def feijao():
    beans = ''.join(e(x, y, 3.4, 2.4, '#4E342E', r) for x, y, r in
                    [(24, 42, 20), (32, 40, -15), (40, 43, 30), (27, 50, -25), (35, 49, 10), (42, 51, -20), (20, 50, 15)])
    return svg(p('M14 10h36l2 48H12z', '#ECEFF1'), rr(12, 18, 40, 10, 0, '#C62828'), rr(16, 34, 32, 22, 3, '#D7CCC8'), beans)

def macarrao():
    strands = ''.join(ln(x, 16, x - 2, 54, '#F6C744', 2.2) for x in range(22, 44, 4))
    return svg(p('M16 10h32v44a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z', '#E3F2FD'), strands, rr(16, 26, 32, 12, 0, '#1E88E5'),
               rr(22, 29, 20, 6, 2, '#FFFFFF'))

def molho():
    return svg(rr(18, 8, 28, 8, 2, '#424242'), p('M16 18h32v36a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z', '#C62828'),
               rr(16, 28, 32, 16, 0, '#FFF3E0'), c(32, 36, 5, '#E53935'), poly(star_pts(32, 32, 3, 1.2, 5), '#43A047'))

def maionese():
    return svg(rr(14, 10, 36, 9, 3, '#1E88E5'), p('M14 20h36v34a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z', '#FFF8E1'),
               rr(14, 30, 36, 14, 0, '#FFFFFF'), e(32, 37, 9, 4, '#F6D743'), hl(19, 50, 1.4, 4, 0, .5))

def enlatado():
    return svg(e(32, 14, 18, 5, '#BDBDBD'), rr(14, 14, 36, 40, 0, '#9E9E9E'), e(32, 54, 18, 5, '#9E9E9E'),
               rr(14, 24, 36, 20, 0, '#1E88E5'), e(32, 14, 14, 3.5, '#E0E0E0'), e(32, 34, 8, 5, '#F6C744'))

def biscoito():
    chips = ''.join(c(x, y, 1.8, '#5D4037') for x, y in [(24, 28), (36, 24), (42, 34), (30, 38), (22, 42), (38, 44)])
    return svg(c(32, 34, 22, '#D9A066'), c(32, 34, 22, 'none', ' stroke="#C08040" stroke-width="2"'), chips, hl(22, 26, 3, 5, -30, .25))

def chocolate():
    grid = ''.join(rr(x, y, 9, 8, 1.5, '#6D4C41') for x in (20, 31) for y in (14, 24, 34))
    return svg(rr(16, 10, 26, 46, 3, '#4E342E'), grid, p('M16 40h26v16a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3z', '#C62828'),
               p('M16 40l6 3 7-3 7 3 6-3', stroke='#E57373', w=1.5))

def salgadinho():
    return svg(p('M14 8h36l-3 6 3 6v28l-3 6 3 6H14l3-6-3-6V20l3-6z', '#E53935'), e(32, 34, 10, 9, '#F6C744'),
               e(30, 33, 4, 3, '#F2A93B', -20), e(35, 36, 3.5, 2.5, '#F2A93B', 20))

def pao():
    return svg(e(32, 38, 26, 15, '#D9954A'), e(32, 34, 22, 11, '#E0A458'), p('M20 30c6-4 18-4 24 0', stroke='#F6D3A0', w=3),
               hl(18, 36, 4, 2, -10, .25))

def leite():
    return svg(poly(['16,18', '28,6', '40,18'], '#BBDEFB'), poly(['40,18', '48,8', '48,14'], '#90CAF9'),
               rr(16, 18, 24, 40, 1, '#FFFFFF', ' stroke="#E0E0E0" stroke-width="1.5"'),
               poly(['40,18', '48,14', '48,54', '40,58'], '#E3F2FD'), rr(16, 30, 24, 14, 0, '#1E88E5'), c(28, 37, 4, '#FFFFFF'))

def queijo():
    holes = c(30, 44, 3, '#E0A82E') + c(42, 38, 2.2, '#E0A82E') + c(20, 46, 1.8, '#E0A82E') + c(46, 47, 1.6, '#E0A82E')
    return svg(poly(['8,34', '56,22', '56,52', '8,52'], '#F6C744'), poly(['8,34', '56,22', '56,28', '8,38'], '#F9D86A'), holes)

def manteiga():
    return svg(rr(10, 22, 44, 26, 0, '#FFFFFF', ' stroke="#E0E0E0" stroke-width="1.5"'),
               e(32, 48, 22, 7, '#FFFFFF', extra=' stroke="#E0E0E0" stroke-width="1.5"'), rr(11, 40, 42, 8, 0, '#FFFFFF'),
               e(32, 22, 22, 7, '#FDD835'), rr(18, 30, 28, 10, 2, '#FFE082'))

def sal():
    dots = ''.join(c(x, 14, 1.4, '#9E9E9E') for x in (26, 32, 38))
    return svg(p('M20 16h24v4l4 6v28a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V26l4-6z', '#ECEFF1'), e(32, 14, 12, 4, '#B0BEC5'), dots,
               rr(16, 32, 32, 12, 0, '#1E88E5'), rr(22, 35, 20, 6, 2, '#FFFFFF'))

def refrigerante():
    return svg(e(32, 12, 14, 4, '#BDBDBD'), rr(18, 12, 28, 44, 0, '#E53935'), e(32, 56, 14, 4, '#C62828'), e(32, 12, 10, 3, '#E0E0E0'),
               p('M18 32c10-6 18 6 28 0', stroke='#FFFFFF', w=3), rr(28, 9, 8, 3, 1.5, '#9E9E9E'), hl(22, 36, 1.5, 10, 0, .3))

def agua():
    return svg(rr(27, 4, 10, 6, 2, '#1565C0'), p('M27 10h10v4c6 3 9 8 9 14v26a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V28c0-6 3-11 9-14z', '#BBDEFB'),
               p('M18 36h28v18a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z', '#64B5F6'), rr(18, 28, 28, 8, 0, '#1E88E5'), hl(22, 46, 1.4, 6, 0, .5))

def papel_higienico():
    return svg(rr(12, 16, 32, 40, 4, '#FAFAFA', ' stroke="#E0E0E0" stroke-width="1.5"'), e(28, 16, 16, 6, '#F5F5F5', extra=' stroke="#E0E0E0" stroke-width="1.5"'),
               e(28, 16, 5, 2, '#BDBDBD'), p('M44 22v30c4 2 8 2 10 0V28', '#FFFFFF', '#E0E0E0', 1.5))

def detergente():
    return svg(rr(28, 4, 8, 6, 2, '#FFFFFF', ' stroke="#BDBDBD" stroke-width="1.5"'),
               p('M26 10h12l2 8c4 2 6 6 6 10v26a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V28c0-4 2-8 6-10z', '#7CB342'),
               rr(20, 32, 24, 14, 2, '#FFFFFF', ' opacity=".9"'), c(30, 39, 3, '#B3E5FC'), c(35, 37, 2, '#B3E5FC'))

def esponja():
    pores = ''.join(c(x, y, 1.3, '#E0B800') for x, y in [(18, 40), (26, 44), (34, 40), (42, 44), (22, 48), (38, 48), (46, 38)])
    return svg(rr(10, 32, 44, 20, 4, '#FDD835'), rr(10, 22, 44, 12, 4, '#43A047'), pores)

def sabonete():
    bubbles = ''.join(c(x, y, r, 'none', ' stroke="#81D4FA" stroke-width="2"') for x, y, r in [(46, 14, 4), (54, 22, 2.8), (40, 10, 2.2)])
    return svg(rr(10, 28, 44, 26, 12, '#F48FB1'), rr(14, 30, 36, 18, 9, '#F8BBD0'), bubbles)

def pasta_de_dente():
    return svg(g(p('M-20-8h34l8 4v8l-8 4h-34z', '#FFFFFF', '#BDBDBD', 1.5) + rr(-24, -7, 5, 14, 1, '#1E88E5') +
                 rr(22, -3, 5, 6, 1, '#1E88E5') + rr(-14, -5, 18, 10, 2, '#E53935'), 'translate(30 32) rotate(-30)'))

def fosforo():
    return svg(rr(8, 30, 44, 24, 3, '#F2994A'), rr(8, 30, 44, 8, 2, '#C62828'), rr(14, 42, 32, 6, 2, '#FFE0B2'),
               ln(36, 30, 52, 10, '#F5DEB3', 3), c(53, 9, 3.4, '#C62828'))

def pipoca():
    pops = ''.join(c(x, y, 5, '#FFF8E1') + c(x + 1, y - 1, 2, '#FFE082')
                   for x, y in [(20, 18), (30, 14), (40, 16), (46, 22), (25, 24), (36, 22), (16, 24)])
    stripes = ''.join(p(f'M{x} 26l{2 if x < 32 else -2} 32', stroke='#E53935', w=4) for x in (20, 28, 36, 44))
    return svg(pops, p('M12 26h40l-5 32H17z', '#FFFFFF', '#E0E0E0', 1), stripes)

def salsicha():
    return svg(g(rr(-24, -6, 48, 12, 6, '#E57373') + hl(-10, -3, 8, 1.4, 0), 'translate(32 26) rotate(-15)'),
               g(rr(-24, -6, 48, 12, 6, '#EF7B7B') + hl(-10, -3, 8, 1.4, 0), 'translate(32 42) rotate(-15)'))

# ------------------------------------------------------------------ catálogo

ICONS = {
    # id: (função, grupo, palavras-chave sem acento, minúsculas)
    'maracuja': (maracuja, 'fruta', ['maracuja']),
    'mamao': (mamao, 'fruta', ['mamao', 'papaia', 'papaya', 'formosa']),
    'goiaba': (goiaba, 'fruta', ['goiaba']),
    'caqui': (caqui, 'fruta', ['caqui', 'kaki']),
    'acerola': (acerola, 'fruta', ['acerola']),
    'pitaya': (pitaya, 'fruta', ['pitaya', 'pitaia']),
    'jabuticaba': (jabuticaba, 'fruta', ['jabuticaba', 'jaboticaba']),
    'graviola': (graviola, 'fruta', ['graviola']),
    'carambola': (carambola, 'fruta', ['carambola']),
    'figo': (figo, 'fruta', ['figo']),
    'ameixa': (ameixa, 'fruta', ['ameixa']),
    'limao-taiti': (limao_taiti, 'fruta', ['limao', 'taiti', 'tahiti', 'lima da persia']),
    'caju': (caju, 'fruta', ['caju']),
    'roma': (roma, 'fruta', ['roma']),
    'chuchu': (chuchu, 'legume', ['chuchu']),
    'mandioca': (mandioca, 'legume', ['mandioca', 'aipim', 'macaxeira']),
    'quiabo': (quiabo, 'legume', ['quiabo']),
    'jilo': (jilo, 'legume', ['jilo']),
    'maxixe': (maxixe, 'legume', ['maxixe']),
    'abobrinha': (abobrinha, 'legume', ['abobrinha', 'abobora italiana']),
    'beterraba': (beterraba, 'legume', ['beterraba']),
    'inhame': (inhame, 'legume', ['inhame', 'cara']),
    'batata-doce': (batata_doce, 'legume', ['batata doce', 'batata-doce']),
    'mandioquinha': (mandioquinha, 'legume', ['mandioquinha', 'batata baroa', 'baroa', 'batata salsa']),
    'vagem': (vagem, 'legume', ['vagem', 'vajem']),
    'ervilha': (ervilha, 'legume', ['ervilha']),
    'abobora-cabotia': (abobora_cabotia, 'legume', ['cabotia', 'cabotian', 'abobora japonesa', 'kabocha']),
    'abobora-moranga': (abobora_moranga, 'legume', ['moranga', 'abobora']),
    'gengibre': (gengibre, 'legume', ['gengibre']),
    'rabanete': (rabanete, 'legume', ['rabanete']),
    'cogumelo': (cogumelo, 'legume', ['cogumelo', 'champignon', 'shimeji', 'shitake', 'shiitake', 'paris']),
    'couve': (couve, 'verdura', ['couve']),
    'alface': (alface, 'verdura', ['alface']),
    'rucula': (rucula, 'verdura', ['rucula']),
    'agriao': (agriao, 'verdura', ['agriao']),
    'espinafre': (espinafre, 'verdura', ['espinafre']),
    'repolho': (repolho, 'verdura', ['repolho']),
    'repolho-roxo': (repolho_roxo, 'verdura', ['repolho roxo']),
    'couve-flor': (couve_flor, 'verdura', ['couve flor', 'couve-flor', 'couveflor']),
    'acelga': (acelga, 'verdura', ['acelga']),
    'salsinha': (salsinha, 'tempero', ['salsinha', 'salsa']),
    'cebolinha': (cebolinha, 'tempero', ['cebolinha']),
    'cheiro-verde': (cheiro_verde, 'tempero', ['cheiro verde', 'cheiro-verde']),
    'coentro': (coentro, 'tempero', ['coentro']),
    'manjericao': (manjericao, 'tempero', ['manjericao', 'alfavaca']),
    'hortela': (hortela, 'tempero', ['hortela', 'menta']),
    'alecrim': (alecrim, 'tempero', ['alecrim']),
    'cebola-roxa': (cebola_roxa, 'tempero', ['cebola roxa']),
    'ovos-cartela': (ovos_cartela, 'granja', ['ovos', 'ovo', 'cartela', 'duzia de ovos']),
    'tamara': (tamara, 'fruta', ['tamara', 'tamaras']),
    'caja': (caja, 'fruta', ['caja', 'taperaba']),
    'lichia': (lichia, 'fruta', ['lichia', 'lichias', 'lichi']),
    'chicoria': (chicoria, 'verdura', ['chicoria', 'escarola', 'almeirao']),
    'louro': (louro, 'tempero', ['louro']),
    'pimentas': (pimentas, 'tempero', ['pimentas', 'pimenta', 'pimenta dedo de moca', 'pimenta de cheiro', 'pimenta biquinho', 'malagueta']),
    'suco-garrafa': (suco_garrafa, 'pronto', ['suco', 'sucos', 'refresco', 'cha', 'agua de coco']),
    'salada-de-frutas': (salada_de_frutas, 'pronto', ['salada de frutas', 'salada de fruta']),
    'legumes-picados': (legumes_picados, 'pronto', ['legumes picados', 'picados', 'sopa pronta', 'mix de legumes']),
    'acucar': (acucar, 'mercearia', ['acucar']),
    'farinha': (farinha, 'mercearia', ['farinha', 'farofa', 'fuba', 'flocao', 'aveia', 'polvilho', 'tapioca', 'mistura p bolo', 'mistura para bolo']),
    'sabao-em-po': (sabao_em_po, 'limpeza', ['sabao po', 'sabao em po', 'lava roupas']),
    'inseticida': (inseticida, 'limpeza', ['baygon', 'inseticida', 'sbp', 'raid', 'repelente']),
    'oleo': (oleo, 'mercearia', ['oleo', 'azeite', 'vinagre']),
    'banana': (banana, 'fruta', ['banana', 'bananas']),
    'maca': (maca, 'fruta', ['maca', 'macas']),
    'maca-verde': (maca_verde, 'fruta', ['maca verde', 'granny smith']),
    'pera': (pera, 'fruta', ['pera', 'peras']),
    'uva': (uva, 'fruta', ['uva', 'uvas']),
    'laranja': (laranja, 'fruta', ['laranja', 'laranjas']),
    'mexerica': (mexerica, 'fruta', ['mexerica', 'tangerina', 'ponkan', 'bergamota', 'murcote', 'murcott']),
    'limao-siciliano': (limao_siciliano, 'fruta', ['limao siciliano', 'siciliano']),
    'melancia': (melancia, 'fruta', ['melancia']),
    'melao': (melao, 'fruta', ['melao', 'pele de sapo']),
    'abacaxi': (abacaxi, 'fruta', ['abacaxi']),
    'morango': (morango, 'fruta', ['morango', 'morangos']),
    'manga': (manga, 'fruta', ['manga', 'mangas', 'palmer', 'tommy']),
    'abacate': (abacate, 'fruta', ['abacate', 'avocado']),
    'kiwi': (kiwi, 'fruta', ['kiwi']),
    'coco': (coco, 'fruta', ['coco', 'coco seco', 'coco verde']),
    'pessego': (pessego, 'fruta', ['pessego', 'nectarina']),
    'cereja': (cereja, 'fruta', ['cereja', 'cerejas']),
    'mirtilo': (mirtilo, 'fruta', ['mirtilo', 'blueberry']),
    'tomate': (tomate, 'legume', ['tomate', 'tomates']),
    'tomate-cereja': (tomate_cereja, 'legume', ['tomatinho', 'tomate cereja', 'tomate grape', 'sweet grape']),
    'batata': (batata, 'legume', ['batata', 'batatas', 'asterix', 'batata inglesa']),
    'cenoura': (cenoura, 'legume', ['cenoura', 'cenouras']),
    'cebola': (cebola, 'legume', ['cebola', 'cebolas']),
    'alho': (alho, 'legume', ['alho']),
    'berinjela': (berinjela, 'legume', ['berinjela']),
    'pepino': (pepino, 'legume', ['pepino']),
    'pimentao': (pimentao, 'legume', ['pimentao', 'pimentao verde']),
    'pimentao-colorido': (pimentao_colorido, 'legume', ['pimentao vermelho', 'pimentao amarelo', 'pimentao colorido']),
    'milho': (milho, 'legume', ['milho', 'espiga']),
    'brocolis': (brocolis, 'verdura', ['brocolis']),
    'mel': (mel, 'granja', ['mel']),
    'cafe': (cafe, 'mercearia', ['cafe']),
    'arroz': (arroz, 'mercearia', ['arroz']),
    'feijao': (feijao, 'mercearia', ['feijao', 'lentilha', 'grao de bico']),
    'macarrao': (macarrao, 'mercearia', ['macarrao', 'miojos', 'espaguete', 'parafuso', 'penne', 'massa', 'miojo', 'lamen']),
    'molho': (molho, 'mercearia', ['molho', 'extrato', 'catchup', 'ketchup', 'mostarda']),
    'maionese': (maionese, 'mercearia', ['maionese']),
    'enlatado': (enlatado, 'mercearia', ['lata', 'enlatado', 'sardinha', 'atum', 'milho em lata', 'ervilha p sopa', 'azeitona']),
    'biscoito': (biscoito, 'mercearia', ['biscoito', 'rosquinha', 'bolacha', 'cookies', 'cookie', 'torrada', 'wafer']),
    'chocolate': (chocolate, 'mercearia', ['chocolate', 'bombom', 'nescau', 'achocolatado', 'toddy']),
    'salgadinho': (salgadinho, 'mercearia', ['salgadinho', 'batata palha', 'chips', 'torcida']),
    'pao': (pao, 'padaria', ['pao', 'paes', 'bisnaguinha', 'bisnaga', 'pao de forma']),
    'leite': (leite, 'laticinio', ['leite', 'leite em po', 'leite condensado', 'creme de leite', 'leite de coco']),
    'queijo': (queijo, 'laticinio', ['queijo', 'parmesao', 'mussarela', 'polenguinho']),
    'manteiga': (manteiga, 'laticinio', ['manteiga', 'margarina', 'requeijao']),
    'sal': (sal, 'mercearia', ['sal', 'sal grosso', 'condimentos', 'caldo', 'sazon', 'canela', 'fermento', 'gelatina', 'tempero pronto']),
    'refrigerante': (refrigerante, 'bebida', ['refrigerante', 'refri', 'coca', 'guarana', 'sprite', 'schweppes', 'tonica', 'gatorade', 'h2o', 'h20', 'del vale', 'guaracamp']),
    'agua': (agua, 'bebida', ['agua', 'aguas', 'agua com gas', 'agua sem gas']),
    'papel-higienico': (papel_higienico, 'limpeza', ['papel higienico', 'papel toalha', 'guardanapo']),
    'detergente': (detergente, 'limpeza', ['detergente', 'multiuso', 'desinfetante', 'agua sanitaria', 'alcool', 'amaciante']),
    'esponja': (esponja, 'limpeza', ['esponja', 'bombril', 'la de aco']),
    'sabonete': (sabonete, 'higiene', ['sabonete', 'shampoo', 'desodorante']),
    'pasta-de-dente': (pasta_de_dente, 'higiene', ['pasta de dente', 'creme dental', 'escova de dente']),
    'fosforo': (fosforo, 'mercearia', ['fosforo', 'fosforos']),
    'pipoca': (pipoca, 'mercearia', ['pipoca', 'milho de pipoca']),
    'salsicha': (salsicha, 'mercearia', ['salsicha', 'linguica']),
    'cat-frutas': (cat_frutas, 'categoria', ['frutas', 'fruta']),
    'cat-legumes': (cat_legumes, 'categoria', ['legumes', 'legume', 'raizes', 'tuberculos']),
    'cat-verduras': (cat_verduras, 'categoria', ['verduras', 'verdura', 'folhas', 'folhosas', 'hortalicas']),
    'cat-temperos': (cat_temperos, 'categoria', ['temperos', 'tempero', 'ervas']),
    'cat-granja': (cat_granja, 'categoria', ['granja', 'ovos']),
    'cat-mercearia': (cat_mercearia, 'categoria', ['mercearia', 'secos', 'graos']),
    'cat-mercadinho': (cat_mercadinho, 'categoria', ['mercadinho', 'mercado', 'mercadao', 'armazem', 'emporio']),
    'cat-laticinios': (cat_laticinios, 'categoria', ['laticinios', 'frios', 'leite', 'queijo']),
    'cat-padaria': (cat_padaria, 'categoria', ['padaria', 'paes', 'pao']),
    'cat-bebidas': (cat_bebidas, 'categoria', ['bebidas', 'sucos', 'suco']),
    'cat-limpeza': (cat_limpeza, 'categoria', ['limpeza', 'higiene']),
    'cat-congelados': (cat_congelados, 'categoria', ['congelados', 'geladeira', 'gelados', 'polpas']),
    'cat-acougue': (cat_acougue, 'categoria', ['acougue', 'carnes', 'carne', 'frango', 'peixe']),
    'cat-promocao': (cat_promocao, 'categoria', ['promocao', 'promocoes', 'oferta', 'ofertas', 'destaque']),
    'cat-organicos': (cat_organicos, 'categoria', ['organicos', 'organico']),
    'cat-combo': (cat_combo, 'categoria', ['combo', 'kit', 'cesta']),
    'cat-outros': (cat_outros, 'categoria', ['outros', 'diversos', 'geral']),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    catalog = []
    for icon_id, (fn, group, keywords) in ICONS.items():
        with open(os.path.join(OUT, icon_id + '.svg'), 'w', encoding='utf-8') as fh:
            fh.write(fn() + '\n')
        catalog.append({'id': icon_id, 'file': f'custom/{icon_id}.svg', 'group': group, 'keywords': keywords})
    with open(os.path.join(os.path.dirname(OUT), 'catalog.json'), 'w', encoding='utf-8') as fh:
        json.dump({'version': 1, 'icons': catalog}, fh, ensure_ascii=False, indent=2)
    print(f'{len(catalog)} ícones gerados em {OUT}')


if __name__ == '__main__':
    main()
