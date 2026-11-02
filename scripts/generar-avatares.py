#!/usr/bin/env python3
"""Genera hooks/avatares.ts: avatares originales de pixel art (16x16) por rol, en PNG base64.

Uso: python3 scripts/generar-avatares.py
"""
import base64, struct, zlib, pathlib

PAL = {
    '.': None,
    'k': (20, 20, 28), 'w': (245, 245, 245), 'e': (25, 25, 35),
    's': (247, 205, 165), 'g': (110, 190, 90), 'b': (120, 160, 230), 'p': (170, 130, 210),
    'W': (230, 230, 240), 'P': (150, 70, 170), 'L': (180, 160, 230), 'T': (60, 190, 190),
    'O': (240, 130, 30), 'B': (40, 80, 180), 'V': (110, 60, 160), 'R': (200, 50, 50),
    'Y': (230, 190, 40), 'D': (40, 40, 60), 'S': (90, 160, 220), 'G': (60, 60, 70),
}

# Cara base: filas 5-11 con piel (letra «F»), ojos «e»; el pelo y el cuerpo se dibujan por encima.
BASE = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "....FFFFFFFF....",
    "...FFFFFFFFFF...",
    "...FFeFFFFeFF...",
    "...FFeFFFFeFF...",
    "...FFFFFFFFFF...",
    "....FFFFFFFF....",
    ".....FFFFFF.....",
    "......FFFF......",
    "...CCCCCCCCCC...",
    "..CCCCCCCCCCCC..",
    "..CCCCCCCCCCCC..",
]

PELOS = {
    'puntas': [  # Goku, Gohan
        "...H..H..H..H...",
        "..HHH.HH.HH.HH..",
        ".HHHHHHHHHHHHHH.",
        "HHHHHHHHHHHHHHHH",
        ".HHHHHHHHHHHHHH.",
        "..HH........HH..",
        "..H..........H..",
    ],
    'llama': [  # Vegeta
        ".......HH.......",
        "......HHHH......",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....HHHHHHHH....",
        "...HHH.HH.HHH...",
        "...H........H...",
    ],
    'turbante': [  # Piccolo
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "...HHHHHHHHHH...",
        "...HHHHHHHHHH...",
        "...XXXXXXXXXX...",
        "................",
    ],
    'domo': [  # Freezer
        "................",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "...HHHHXXHHHH...",
        "...HHHXXXXHHH...",
        "...HHHHHHHHHH...",
        "................",
    ],
    'raya': [  # Trunks
        "................",
        "................",
        "....HHHHHHHH....",
        "...HHHHHHHHHH...",
        "..HHHHHHHHHHHH..",
        "..HHH......HHH..",
        "..HH........HH..",
    ],
    'melena': [  # Bulma
        "................",
        "................",
        "....HHHHHHHH....",
        "...HHHHHHHHHH...",
        "..HHHHHHHHHHHH..",
        "..HHHH....HHHH..",
        "..HH........HH..",
    ],
    'orejas': [  # Bills
        "...H........H...",
        "...HH......HH...",
        "...HHH....HHH...",
        "....HHHHHHHH....",
        "....HHHHHHHH....",
        "................",
        "................",
    ],
    'alto': [  # Whis, Vados
        "......HHHH......",
        ".....HHHHHH.....",
        ".....HHHHHH.....",
        "....HHHHHHHH....",
        "....HHHHHHHH....",
        "................",
        "................",
    ],
    'antenas': [  # Kaio-sama
        "...H........H...",
        "....H......H....",
        ".....H....H.....",
        "................",
        "................",
        "................",
        "................",
    ],
}

# rol: (pelo, color de pelo, piel, ropa, extra)
AVATARES = {
    'frontend': ('puntas', 'k', 's', 'O', None),
    'backend': ('llama', 'k', 's', 'B', None),
    'fullstack': ('puntas', 'k', 's', 'V', None),
    'devops': ('turbante', 'w', 'g', 'P', 'p'),
    'seguridad': ('domo', 'W', 'W', 'P', 'P'),
    'qa': ('raya', 'L', 's', 'B', None),
    'producto': ('melena', 'T', 's', 'R', None),
    'arquitecto': ('orejas', 'p', 'p', 'Y', None),
    'critico-diseno': ('alto', 'w', 'S', 'D', None),
    'escritor': ('antenas', 'k', 'S', 'G', 'gafas'),
    'whis': ('alto', 'w', 'S', 'R', None),
}


def dibujar(pelo, cpelo, piel, ropa, extra):
    grid = [list(f) for f in BASE]
    for y, fila in enumerate(grid):
        for x, c in enumerate(fila):
            grid[y][x] = piel if c == 'F' else ropa if c == 'C' else c
    for y, fila in enumerate(PELOS[pelo]):
        for x, c in enumerate(fila):
            if c == 'H':
                grid[y][x] = cpelo
            elif c == 'X':
                grid[y][x] = extra or cpelo
    if extra == 'gafas':
        for x in range(4, 12):
            grid[7][x] = 'k'
    return grid


def png(grid):
    raw = b''.join(b'\x00' + b''.join(bytes(PAL[c] + (255,)) if PAL[c] else b'\x00\x00\x00\x00' for c in fila) for fila in grid)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    h, w = len(grid), len(grid[0])
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')


def main():
    raiz = pathlib.Path(__file__).resolve().parent.parent
    lineas = ['// Generado por scripts/generar-avatares.py: avatares originales de pixel art (16x16), PNG en base64.',
              'export const AVATARES: Record<string, string> = {']
    for rol, args in AVATARES.items():
        lineas.append(f"  '{rol}': '{base64.b64encode(png(dibujar(*args))).decode()}',")
    lineas.append('}')
    (raiz / 'hooks' / 'avatares.ts').write_text('\n'.join(lineas) + '\n')
    for rol, args in AVATARES.items():  # vista previa en la terminal
        print(rol); print('\n'.join(''.join(c if c != '.' else ' ' for c in f) for f in dibujar(*args)))


if __name__ == '__main__':
    main()
