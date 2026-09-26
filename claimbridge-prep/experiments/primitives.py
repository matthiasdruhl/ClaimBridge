"""Small isolated functions for preparation risk tests; not a product backend."""
import hashlib,json,re
from datetime import date,timedelta
from pathlib import Path
from decimal import Decimal,ROUND_HALF_UP
from jsonschema import Draft202012Validator,FormatChecker
from referencing import Registry,Resource
R=Path(__file__).resolve().parents[1]
def normalized(s): return ' '.join(s.split())
def cents(s):
 if s.strip() in ('--','', 'not determined'): return None
 return int((Decimal(s.replace('$','').replace(',',''))*100).quantize(Decimal('1')))
def deadline(receipt,days=180):
 if receipt is None:return None
 return (date.fromisoformat(receipt)+timedelta(days=days)).isoformat()
def member_cost(recognized,deductible_remaining,rate_bps,oop_remaining):
 if any(v is None for v in (recognized,deductible_remaining,rate_bps,oop_remaining)):return None
 ded=min(recognized,deductible_remaining)
 coins=int((Decimal(recognized-ded)*Decimal(rate_bps)/10000).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
 return min(ded+coins,oop_remaining)
def registry():
 reg=Registry()
 for p in (R/'schemas').glob('*.schema.json'):
  s=json.loads(p.read_text());reg=reg.with_resource(s['$id'],Resource.from_contents(s))
 return reg

def validate(data,kind='claim'):
 s=json.loads((R/f'schemas/{kind}.schema.json').read_text())
 Draft202012Validator(s,registry=registry(),format_checker=FormatChecker()).validate(data)
 if kind!='claim':return
 ev={x['id']:x for x in data['evidence']}
 if len(ev)!=len(data['evidence']):raise ValueError('duplicate evidence IDs')
 srcs={x['id']:x for x in json.loads((R/'research/sources.json').read_text())}
 for e in ev.values():
  if hashlib.sha256(e['text'].encode()).hexdigest()!=e['content_sha256']:raise ValueError('hash mismatch')
  if e['domain']=='external':
   s=srcs.get(e['source_id'])
   if not s or e['source_url']!=s['url']:raise ValueError('unapproved source')
 def walk(x,path=''):
  if isinstance(x,dict):
   if 'evidence_ids' in x:
    if not set(x['evidence_ids'])<=set(ev):raise ValueError('dangling citation: '+path)
   if {'value','status','evidence_ids','derivation'}<=set(x):
    if x['status']=='unknown' and (x['value'] is not None or not x['reason']):raise ValueError('invalid unknown')
    if x['status'] not in ('unknown','conflicted') and (x['value'] is None or not x['evidence_ids']):raise ValueError('ungrounded fact')
    if x['status']=='derived' and not x['derivation']:raise ValueError('missing derivation')
   for k,v in x.items():walk(v,path+'.'+k)
  elif isinstance(x,list):
   for i,v in enumerate(x):walk(v,path+'.'+str(i))
 walk(data)
 services={x['id'] for x in data['services']};providers={x['id'] for x in data['providers']}
 if any(x['service_id'] not in services for x in data['eobs']):raise ValueError('unknown service')
 if any(x['provider_id'] not in providers for x in data['services']):raise ValueError('unknown provider')
 if data['denial']['received_date']['value'] is None and data['denial']['deadline']['value'] is not None:raise ValueError('deadline without trigger')
