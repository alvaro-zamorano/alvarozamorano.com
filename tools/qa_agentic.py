# Agent readiness: Lighthouse 13's "Agentic Browsing" category on a few pages
# (accessibility tree, layout shift, llms.txt; WebMCP and ai-catalog.json are
# listed but carry no weight yet). Google marks the category as under
# development, so CI runs this as information, not as a gate.
# usage: python3 tools/qa_agentic.py OUTDIR BASE_URL PATH [PATH ...]
# Exits 1 if any page scores below 1.
import json, subprocess, sys

LIGHTHOUSE = 'lighthouse@13.5.0'
OUT, BASE, PATHS = sys.argv[1], sys.argv[2].rstrip('/'), sys.argv[3:] or ['/']
failed = False

for path in PATHS:
    slug = path.strip('/').replace('/', '_') or 'home'
    report = f'{OUT}/agentic_{slug}.json'
    subprocess.run(
        ['npx', '--yes', LIGHTHOUSE, BASE + path, '--only-categories=agentic-browsing',
         '--output=json', f'--output-path={report}', '--quiet',
         '--chrome-flags=--headless=new --no-sandbox'],
        check=True,
    )
    lhr = json.load(open(report))
    cat = lhr['categories']['agentic-browsing']
    misses = [
        lhr['audits'][r['id']]['title']
        for r in cat['auditRefs']
        if r.get('weight') and (lhr['audits'][r['id']].get('score') or 0) < 1
    ]
    score = cat.get('score')
    print(json.dumps({'page': path, 'lighthouse': lhr['lighthouseVersion'], 'agentic_browsing': score, 'misses': misses}))
    failed = failed or score is None or score < 1

sys.exit(1 if failed else 0)
