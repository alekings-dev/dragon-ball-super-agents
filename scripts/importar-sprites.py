#!/usr/bin/env python3
"""Importa los sprites de «Dragon Ball Sagas» al mapa: visor/sprites/<rol>.png + visor/sprites/indice.json.

Cada rol queda en una sola hoja: una fila por animación (quieto, camina, aura, entrega, caida), cuadros del mismo
tamaño, apoyados abajo y al centro. El fondo de cada cuadro (blanco, gris o azul según el autor) se vuelve transparente
rellenando desde los bordes, así no se borran las partes claras del personaje (la capa de Piccolo, el cuerpo de Freezer).
Los créditos de cada autor («Hecho por ….txt») van a visor/sprites/CREDITOS.md.

Requiere Pillow. Uso: python3 scripts/importar-sprites.py "/ruta/a/Dragon Ball Sagas"
"""
import json, pathlib, re, sys
from collections import deque
from PIL import Image

# rol: (carpeta, {animación: [número de cuadro]}). Los números son los del nombre de cada PNG.
EQUIPO = {
    'frontend': ('GOKU fases/Goku', {'quieto': [36, 37, 38], 'camina': [12, 13], 'aura': [56, 57, 58], 'entrega': [82, 83], 'caida': [47]}),
    'backend': ('VEGETA fases/Vegeta', {'quieto': [38, 39, 40], 'camina': [12, 13], 'aura': [3, 4, 5], 'entrega': [57, 58], 'caida': [42]}),
    'fullstack': ('GOHAN fases/Gohan Adulto', {'quieto': [3, 4, 5, 6], 'camina': [12, 32], 'aura': [84, 85, 86], 'entrega': [88, 89, 90], 'caida': [69]}),
    'devops': ('Piccolo', {'quieto': [3, 4, 5, 6], 'camina': [15, 16], 'aura': [89, 90, 91], 'entrega': [62, 64], 'caida': [51]}),
    'seguridad': ('FREEZA formas/Freeza Forma Final', {'quieto': [1, 2, 3], 'camina': [23, 24], 'aura': [45, 46, 47], 'entrega': [54, 55], 'caida': [38]}),
    'qa': ('MIRAI TRUNKS fases/Mirai Trunks', {'quieto': [3, 4, 5], 'camina': [27, 28], 'aura': [17, 18], 'entrega': [94, 95], 'caida': [62]}),
    'arquitecto': ('Bills', {'quieto': [3, 4, 5], 'camina': [25, 26], 'aura': [73, 75, 77], 'entrega': [130, 131, 132], 'caida': [67]}),
    'producto': ('ANDROIDES/Androide 18', {'quieto': [1, 2, 3], 'camina': [6, 7], 'aura': [5, 32], 'entrega': [10, 11], 'caida': [36]}),
    'critico-diseno': ('Jiren', {'quieto': [1, 2, 3], 'camina': [7, 8], 'aura': [75, 82, 83], 'entrega': [67, 69], 'caida': [66]}),
    'escritor': ('Kuririn', {'quieto': [15, 16, 17], 'camina': [18, 19], 'aura': [5, 6, 7], 'entrega': [59, 61], 'caida': [50]}),
    'lider': ('HITTO/Hitto', {'quieto': [3, 4, 6], 'camina': [60, 61], 'aura': [70, 71, 72], 'entrega': [122, 123], 'caida': [65]}),
}
ORDEN = ['quieto', 'camina', 'aura', 'entrega', 'caida']
TOLERANCIA = 40


def cuadro(carpeta, n):
    for f in carpeta.glob('*.png'):
        nums = re.findall(r'\d+', f.stem)
        if nums and int(nums[-1]) == n:
            return f
    raise SystemExit(f'No encontré el cuadro {n} en {carpeta}')


def sin_fondo(im):
    """Vuelve transparente el fondo conectado a los bordes (relleno por inundación desde las 4 orillas)."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    fondo = px[0, 0][:3]
    cerca = lambda c: sum(abs(a - b) for a, b in zip(c[:3], fondo)) <= TOLERANCIA
    cola = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    visto = set()
    while cola:
        x, y = cola.popleft()
        if (x, y) in visto or not (0 <= x < w and 0 <= y < h):
            continue
        visto.add((x, y))
        if px[x, y][3] and cerca(px[x, y]):
            px[x, y] = (0, 0, 0, 0)
            cola.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    caja = im.getbbox()
    return im.crop(caja) if caja else im


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    origen = pathlib.Path(sys.argv[1])
    destino = pathlib.Path(__file__).resolve().parent.parent / 'visor' / 'sprites'
    destino.mkdir(parents=True, exist_ok=True)
    indice, creditos = {}, []
    for rol, (sub, anims) in EQUIPO.items():
        carpeta = origen / sub
        filas = {a: [sin_fondo(Image.open(cuadro(carpeta, n))) for n in anims[a]] for a in ORDEN}
        # Una celda común para todo el personaje: así no salta de tamaño al cambiar de animación.
        cw = max(im.width for fs in filas.values() for im in fs)
        ch = max(im.height for fs in filas.values() for im in fs)
        hoja = Image.new('RGBA', (cw * max(len(fs) for fs in filas.values()), ch * len(ORDEN)))
        for fila, a in enumerate(ORDEN):
            for i, im in enumerate(filas[a]):
                hoja.paste(im, (i * cw + (cw - im.width) // 2, fila * ch + ch - im.height), im)
        hoja.save(destino / f'{rol}.png', optimize=True)
        indice[rol] = {'w': cw, 'h': ch, 'alto': max(im.height for im in filas['quieto']), 'animaciones': {a: {'fila': f, 'cuadros': len(filas[a])} for f, a in enumerate(ORDEN)}}
        autor = next((p.stem.replace('Hecho por', '').strip() for p in [*carpeta.glob('Hecho por*.txt'), *carpeta.parent.glob('Hecho por*.txt')]), 'autor sin indicar')
        creditos.append(f'| `{rol}` | {sub} | {autor} |')
        print(f'{rol}: {cw}x{ch}, ' + ', '.join(f'{a} {len(filas[a])}' for a in ORDEN))
    (destino / 'indice.json').write_text(json.dumps(indice, indent=1) + '\n')
    (destino / 'CREDITOS.md').write_text(
        '# Créditos de los sprites\n\nSprites de fans de la colección «Dragon Ball Sagas», con el autor que indica cada carpeta '
        '(«Hecho por …»). Se usan sin fines comerciales; Dragon Ball pertenece a sus dueños.\n\n'
        '| Rol | Carpeta | Autor |\n| --- | --- | --- |\n' + '\n'.join(creditos) + '\n')


if __name__ == '__main__':
    main()
