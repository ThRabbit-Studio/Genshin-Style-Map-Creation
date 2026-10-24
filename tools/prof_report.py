# -*- coding: utf-8 -*-
import json, glob, sys

files = sorted(glob.glob.glob('tools/prof/*.cpuprofile') if False else glob.glob('tools/prof/*.cpuprofile'))
p = json.load(open(files[-1], encoding='utf-8'))
self_hits = {}
for n in p['nodes']:
    name = n['callFrame'].get('functionName') or '(anon)'
    line = n['callFrame'].get('lineNumber', -1)
    key = '%s :%d' % (name, line)
    self_hits[key] = self_hits.get(key, 0) + n.get('hitCount', 0)
total = float(sum(self_hits.values())) or 1
for k, v in sorted(self_hits.items(), key=lambda x: -x[1])[:16]:
    print('%5.1f%%  %s' % (v * 100.0 / total, k))
