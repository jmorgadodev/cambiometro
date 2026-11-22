#!/usr/bin/env python3
"""Read-only, manual commission context capture. No vote ETL, schedule or remote writes."""
import argparse, concurrent.futures, datetime, hashlib, json, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
BASE = 'https://opendata.camara.cl/camaradiputados/WServices/WSComision.asmx/'
NS = {'c': 'http://opendata.camara.cl/camaradiputados/v1'}
def text(element, key):
    return (element.findtext('c:' + key, default='', namespaces=NS) or '').strip()
def member(element):
    deputy = element.find('c:Diputado', NS)
    if deputy is None: return None
    return dict(officialId=text(deputy, 'Id'), name=' '.join(text(deputy, key) for key in ['Nombre', 'Nombre2', 'ApellidoPaterno', 'ApellidoMaterno'] if text(deputy, key)), fromDate=text(element, 'FechaInicio')[:10] or None, toDate=text(element, 'FechaTermino')[:10] or None)
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--year', type=int, required=True)
    parser.add_argument('--reviewed-at', required=True, help='YYYY-MM-DD, date of source review')
    parser.add_argument('--cache-dir', type=Path)
    parser.add_argument('--write', action='store_true', help='Write reviewed context; default only produces candidate')
    args = parser.parse_args()
    if args.year < 2026: parser.error('Only 2026 onward')
    datetime.date.fromisoformat(args.reviewed_at)
    cache = args.cache_dir or Path('artifacts/voting-commissions') / str(args.year) / args.reviewed_at
    cache.mkdir(parents=True, exist_ok=True)
    def read(name, url):
        path = cache / name
        if not path.exists():
            with urllib.request.urlopen(url, timeout=25) as response:
                body = response.read(4_000_001)
            if len(body) > 4_000_000: raise ValueError('Oversized response')
            ET.fromstring(body)  # Validate before freezing cache.
            path.write_bytes(body)
        return ET.fromstring(path.read_bytes())
    previous = json.loads(Path('data/voting-context.json').read_text(encoding='utf-8'))
    previous_by_id = {c['id']: c for c in previous.get('commissions', [])}
    index = read('comisiones-vigentes.xml', BASE + 'retornarComisionesVigentes')
    def capture(entry):
        identifier = text(entry, 'Id')
        if not identifier.isdecimal(): raise ValueError('Invalid commission ID')
        url = BASE + 'retornarComision?prmComisionId=' + identifier
        details = read('comision-' + identifier + '.xml', url)
        members = [m for item in details.findall('c:Integrantes/c:DiputadoIntegrante', NS) if (m := member(item))]
        sessions_url = BASE + 'retornarSesionesXComisionYAnno?prmComisionId=' + identifier + '&prmAnno=' + str(args.year)
        sessions, failure = [], None
        try:
            root = read('sesiones-' + identifier + '.xml', sessions_url)
            for item in root.findall('c:Sesiones/c:SesionComision', NS):
                date = text(item, 'FechaInicio')[:10]
                if date.startswith(str(args.year) + '-'):
                    sessions.append(dict(id=text(item, 'Id'), number=text(item, 'Numero'), date=date, state=text(item, 'Estado'), type=text(item, 'Tipo')))
        except (OSError, ET.ParseError, ValueError) as error:
            failure = type(error).__name__
            sessions = previous_by_id.get('camara-' + identifier, {}).get('sessions', [])
        return dict(id='camara-' + identifier, name=text(entry, 'NombreWeb') or text(entry, 'Nombre'), chamber='Cámara', type=text(entry, 'Tipo'), fromDate=text(entry, 'FechaInicio')[:10], toDate=text(entry, 'FechaTermino')[:10], president=' '.join(text(entry, 'Presidente/' + key) for key in ['Nombre', 'ApellidoPaterno', 'ApellidoMaterno']), members=members, sessions=sorted(sessions, key=lambda item: item['date'], reverse=True), sourceUrl=url, sessionsUrl=sessions_url, projectBulletins=[], **({'sessionCaptureError': failure} if failure else {}))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        commissions = list(pool.map(capture, list(index)))
    target = Path('data/voting-context.json')
    context = json.loads(target.read_text(encoding='utf-8'))
    context.update(reviewedAt=args.reviewed_at, commissions=sorted(commissions, key=lambda item: item['name']))
    candidate = cache / 'candidate.json'
    candidate.write_text(json.dumps(context, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    receipt = dict(year=args.year, reviewedAt=args.reviewed_at, commissions=len(commissions), candidateSha256=hashlib.sha256(candidate.read_bytes()).hexdigest(), files=[dict(path=str(p), sha256=hashlib.sha256(p.read_bytes()).hexdigest(), bytes=p.stat().st_size) for p in sorted(cache.glob('*.xml'))], remoteWrites=False, scheduled=False)
    (cache / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    if args.write:
        if any(c.get('sessionCaptureError') for c in commissions):
            raise SystemExit('Candidate is partial; original context preserved. Review receipt before retrying.')
        target.write_bytes(candidate.read_bytes())
    print(json.dumps(dict(candidate=str(candidate), commissions=len(commissions), written=args.write)))
if __name__ == '__main__': main()
