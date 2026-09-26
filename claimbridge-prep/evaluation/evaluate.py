"""Evaluate candidate Claim JSON. Gold-fixture runs are evaluator smoke checks only."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'experiments'))
from primitives import R,validate

def lookup(value,parts):
 if not parts:return value
 key,*rest=parts
 if key=='*':return [lookup(v,rest) for v in value]
 return lookup(value[int(key)] if isinstance(value,list) else value[key],rest)
def evaluate(candidate,stage):
 validate(candidate)
 results=[]
 for t in json.loads((R/'evaluation/golden-tests.json').read_text())['tests']:
  if t['stage']!=stage:continue
  try:
   actual=lookup(candidate,t['path'].split('.'))
   ok=actual==t['expected'] if t['op']=='equals' else set(t['expected'])<=set(actual)
   results.append({'id':t['id'],'category':t['category'],'passed':ok,'actual':actual,'expected':t['expected']})
  except (KeyError,IndexError,TypeError) as e:results.append({'id':t['id'],'category':t['category'],'passed':False,'error':str(e)})
 return {'stage':stage,'passed':sum(x['passed'] for x in results),'total':len(results),'results':results,'limitations':'Field/source-presence assertions only; human citation entailment/actionability review still required.'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('candidate',type=Path);p.add_argument('--stage',choices=['initial','clarified'],required=True);p.add_argument('--output',type=Path);a=p.parse_args()
 report=evaluate(json.loads(a.candidate.read_text()),a.stage)
 if a.output:a.output.write_text(json.dumps(report,indent=2)+'\n')
 print(f"{report['passed']}/{report['total']} passed ({a.stage}); source: {a.candidate}")
 sys.exit(report['passed']!=report['total'])
