#!/usr/bin/env python3
"""Genera visor/arte.js: arte original de pixel art (16x16) para el mapa del equipo, en PNG base64.

Suelos de cada sala, muebles y decoración del mapa (rocas, palmeras, la fuente de Hit, la casita de la isla).
Reutiliza el escritor de PNG de generar-avatares.py.

Uso: python3 scripts/generar-arte.py
"""
import base64, importlib.util, pathlib

aqui = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('avatares', aqui / 'generar-avatares.py')
avatares = importlib.util.module_from_spec(spec)
spec.loader.exec_module(avatares)

PAL = {
    '.': None,
    'k': (25, 25, 35), 'w': (245, 245, 245), 'l': (200, 205, 215), 'm': (130, 135, 150), 'd': (70, 75, 90),
    'n': (150, 100, 55), 'N': (100, 65, 35), 'g': (90, 175, 80), 'G': (45, 115, 55), 'c': (190, 105, 60),
    'b': (90, 170, 240), 'B': (35, 70, 150), 'y': (240, 200, 60), 'r': (210, 60, 50), 'p': (165, 115, 215),
    'P': (90, 55, 130), 'o': (240, 140, 40), 't': (70, 205, 205), 'W': (228, 236, 246), 's': (235, 200, 140),
    'S': (200, 155, 95), 'u': (70, 150, 225), 'U': (40, 100, 185), 'f': (250, 185, 200), 'F': (215, 105, 135),
    'h': (255, 255, 255),
}
avatares.PAL = PAL  # png() lee la paleta del módulo

# Muebles y decoración. Filas de menos de 16 se completan con transparente.
SPRITES = {
    'planta': [
        "................", ".....g...g......", "...gggG.gGgg....", "..gGggggggGgg...", "..ggGgGgGggGg...",
        "...gggGgGgggg...", "....gGggGgGg....", ".....gGggGg.....", "......gGgg......", ".....kkkkkk.....",
        ".....kcccck.....", ".....kcccck.....", "......kcck......", "......kcck......", "......kkkk......",
    ],
    'escritorio': [
        "................", "...kkkkkkkkkk...", "...kBBBBBBBBk...", "...kBbbbbbbBk...", "...kBbhbbbbBk...",
        "...kBbbbbbbBk...", "...kBBBBBBBBk...", "...kkkkkkkkkk...", ".......kk.......", ".....kkkkkk.....",
        "kkkkkkkkkkkkkkkk", "knnnnnnnnnnnnnnk", "kNNNNNNNNNNNNNNk", "kNk..........kNk", "kNk..........kNk", "kkk..........kkk",
    ],
    'estante': [
        "kkkkkkkkkkkkkkkk", "kNNNNNNNNNNNNNNk", "kNrrbbyyggrrbbNk", "kNrrbbyyggrrbbNk", "kNNNNNNNNNNNNNNk",
        "kNyyggrrbbppyyNk", "kNyyggrrbbppyyNk", "kNNNNNNNNNNNNNNk", "kNbbppyyrrggbbNk", "kNbbppyyrrggbbNk",
        "kNNNNNNNNNNNNNNk", "kNggrrbbyyppggNk", "kNggrrbbyyppggNk", "kNNNNNNNNNNNNNNk", "kkkkkkkkkkkkkkkk",
    ],
    'pilar': [
        "..kkkkkkkkkkkk..", "..kWWWWWWWWWWk..", "...kkkkkkkkkk...", "....kWlWWlWk....", "....kWlWWlWk....",
        "....kWlWWlWk....", "....kWlWWlWk....", "....kWlWWlWk....", "....kWlWWlWk....", "....kWlWWlWk....",
        "....kWlWWlWk....", "....kWlWWlWk....", "...kkkkkkkkkk...", "..kWWWWWWWWWWk..", "..kkkkkkkkkkkk..",
    ],
    'consola': [
        "................", "................", "..kkkkkkkkkkkk..", ".kddddddddddddk.", ".kdttdbbbbdrrdk.",
        ".kdttdbhbbdrrdk.", ".kddddddddddddk.", "kmmmmmmmmmmmmmmk", "kmyymrrmggmbbmmk", "kmmmmmmmmmmmmmmk",
        "kddddddddddddddk", "kdk..........kdk", "kdk..........kdk", "kkk..........kkk",
    ],
    'capsula': [
        "................", ".....kkkkkk.....", "...kkllllllkk...", "..klllwwlllllk..", "..kllwbbbbwllk..",
        ".klllbbhbbblllk.", ".klllbbbbbblllk.", ".kllllbbbbllllk.", ".kmmmmmmmmmmmmk.", ".kmyymmmmmmrrmk.",
        ".kmmmmmmmmmmmmk.", "..kllllllllllk..", "...kmmk..kmmk...", "...kkkk..kkkk...",
    ],
    'pesa': [
        "................", "................", "................", "................", "................",
        "................", "..kk........kk..", ".kddk......kddk.", ".kddkkkkkkkkddk.", ".kddmmmmmmmmddk.",
        ".kddkkkkkkkkddk.", ".kddk......kddk.", "..kk........kk..",
    ],
    'mesa': [
        "................", "................", "................", "................", "......kkkk......",
        "....kkwwwwkk....", "...kwoyoyroyk...", "...kwyoryoowk...", "....kkwwwwkk....", ".kkkkkkkkkkkkkk.",
        "kNnnnnnnnnnnnnNk", "kNNNNNNNNNNNNNNk", ".kNk........kNk.", ".kNk........kNk.", ".kkk........kkk.",
    ],
    'ventana': [
        "................", ".....kkkkkk.....", "...kkPPPPPPkk...", "..kPPBBBBBBPPk..", "..kPBBhBBBBBPk..",
        ".kPBBhBBBBBBBPk.", ".kPBBBBBBBwBBPk.", ".kPBBBBBBBBBBPk.", ".kPBBBwBBBBBBPk.", ".kPBBBBBBBBBBPk.",
        "..kPBBBBBBBBPk..", "..kPPBBBBBBPPk..", "...kkPPPPPPkk...", ".....kkkkkk.....",
    ],
    'cojin': [
        "................", "................", "................", "................", "................",
        "................", "................", "...kkkkkkkkkk...", "..kppppppppppk..", ".kppPPppppPPppk.",
        ".kppppyyyyppppk.", ".kppPPppppPPppk.", "..kppppppppppk..", "...kkkkkkkkkk...",
    ],
    'baston': [
        "......kkkk......", ".....kbbbbk.....", ".....kbhbbk.....", ".....kbbbbk.....", "......kkkk......",
        ".......kk.......", ".......ky.......", ".......kk.......", ".......ky.......", ".......kk.......",
        ".......ky.......", ".......kk.......", ".......ky.......", "......kkkk......", ".....kWWWWk.....", ".....kkkkkk.....",
    ],
    'arbol': [
        ".....kkkkkk.....", "...kkggggggkk...", "..kggGgggGgggk..", ".kgggggGggggGgk.", ".kgGgggggGgggggk",
        ".kggggGgggggGgk.", "..kgGggggGgggk..", "...kkgggggkkk...", ".....kkNNkk.....", "......kNNk......",
        "......kNNk......", "......kNNk......", ".....kNNNNk.....", ".....kkkkkk.....",
    ],
    'casita': [
        "................", "......kkkk......", "....kkrrrrkk....", "..kkrrrrrrrrkk..", ".krrrrrrrrrrrrk.",
        "kkkkkkkkkkkkkkkk", ".kffffffffffffk.", ".kffkkkffkkkffk.", ".kffkbkffkbkffk.", ".kffkkkffkkkffk.",
        ".kfffffkkfffffk.", ".kfffffkNkffffk.", ".kfffffkNkffffk.", ".kkkkkkkkkkkkkk.",
    ],
    'palmera': [
        "...gg.....gg....", "..gGgg...ggGg...", ".gg..gg.gg..gg..", "......gGg.......", "....gg.n.gg.....",
        "...g...n...g....", ".......n........", "......nN........", "......nN........", "......Nn........",
        "......nN........", ".....nNn........", ".....NnN........", "....SSSSS.......",
    ],
    'roca': [
        "................", "................", "................", "................", "................",
        "................", "................", "......kkkk......", "....kkmlllkk....", "...kmllwllmmk...",
        "..kmlllllmmmdk..", "..kmmlllmmmddk..", "..kdmmmmmdddk...", "...kkkkkkkkk....",
    ],
    'fuente': [
        ".......kk.......", "......ktbk......", ".......kk.......", "......kbtk......", "...kkkktbkkkk...",
        "..kWWWWWWWWWWk..", ".kWuuuuuuuuuuWk.", ".kWuubuuuubuuWk.", ".kWuuuuuuuuuuWk.", "..kWWWWWWWWWWk..",
        "...kkWWWWWWkk...", ".....kWWWWk.....", "....kWWWWWWk....", "....kkkkkkkk....",
    ],
}


def suelo(base, linea, tipo, acento=None):
    """Baldosa de 16x16 repetible para el suelo de una sala."""
    g = [[base] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            if tipo == 'baldosa' and (x % 8 == 0 or y % 8 == 0):
                g[y][x] = linea
            elif tipo == 'madera' and (y % 4 == 0 or (x == (0 if (y // 4) % 2 else 8) and y % 4)):
                g[y][x] = linea
            elif tipo == 'metal' and (x in (0, 15) or y in (0, 15) or (x, y) in ((3, 3), (12, 3), (3, 12), (12, 12))):
                g[y][x] = linea
            elif tipo == 'piedra' and ((y in (0, 8) and True) or (x == (5 if y < 8 else 12))):
                g[y][x] = linea
            elif tipo == 'pasto' and (x * 7 + y * 13) % 11 == 0:
                g[y][x] = linea
            elif tipo == 'arena' and (x * 5 + y * 11) % 17 == 0:
                g[y][x] = linea
    if acento:  # un brillo o detalle que rompe la repetición
        g[4][4] = g[11][12] = acento
    return g


SUELOS = {
    'capsula': suelo('w', 'l', 'baldosa', 'b'),
    'bills': suelo('P', 'k', 'piedra', 'p'),
    'gravedad': suelo('m', 'd', 'metal', 'r'),
    'goku': suelo('n', 'N', 'madera'),
    'gohan': suelo('s', 'S', 'madera'),
    'kami': suelo('W', 'l', 'piedra'),
    'freezer': suelo('P', 'k', 'metal', 'p'),
    'tiempo': suelo('l', 'm', 'metal', 'y'),
    'vados': suelo('W', 'b', 'baldosa'),
    'kaio': suelo('g', 'G', 'pasto'),
    'arena': suelo('s', 'S', 'arena'),
    'agua': suelo('u', 'U', 'pasto', 'h'),
}


def completar(filas):
    filas = [f.ljust(16, '.')[:16] for f in filas]
    return [list(f) for f in (["." * 16] * (16 - len(filas)) + filas)]  # se apoyan abajo


def main():
    raiz = aqui.parent
    datos = {**{f'suelo-{k}': v for k, v in SUELOS.items()}, **{k: completar(v) for k, v in SPRITES.items()}}
    lineas = ['// Generado por scripts/generar-arte.py: arte original de pixel art (16x16) del mapa, PNG en base64.',
              'window.ARTE = {']
    for nombre, grid in datos.items():
        lineas.append(f"  '{nombre}': 'data:image/png;base64,{base64.b64encode(avatares.png(grid)).decode()}',")
    lineas.append('}')
    (raiz / 'visor' / 'arte.js').write_text('\n'.join(lineas) + '\n')
    for nombre, grid in datos.items():  # vista previa en la terminal
        if not nombre.startswith('suelo-'):
            print(nombre); print('\n'.join(''.join(c if c != '.' else ' ' for c in f) for f in grid))


if __name__ == '__main__':
    main()
