"""Career OS Job Intelligence — public-safe, dependency-light engine.

Public framework owns algorithms only. Personal profile, observations and statuses
must live in private career-memory or Google Drive. No automatic applications.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import html
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

UTC = dt.timezone.utc

def now(): return dt.datetime.now(UTC).isoformat(timespec='seconds')
def slug(s): return re.sub(r'\s+', ' ', str(s or '').strip()).casefold()
def clean(s): return re.sub(r'<[^>]+>', ' ', html.unescape(str(s or ''))).strip()
def digest(s): return hashlib.sha256(s.encode('utf8')).hexdigest()[:22]
def key_for(item):
    # Preserve multiple positions at the same company/title when location/team differ.
    stable = item.get('external_id') or ''
    return digest('|'.join([slug(item.get('source')),slug(stable or item.get('url')),slug(item.get('company')),slug(item.get('location'))]))

def get_json(url, headers=None):
    req=urllib.request.Request(url,headers={'User-Agent':'CareerOS-JobIntel/0.1 (+personal research; respect rate limits)',**(headers or {})})
    with urllib.request.urlopen(req,timeout=22) as resp:
        return json.loads(resp.read(4_000_000).decode('utf8'))

def get_text(url):
    req=urllib.request.Request(url,headers={'User-Agent':'CareerOS-JobIntel/0.1'})
    with urllib.request.urlopen(req,timeout=22) as resp: return resp.read(4_000_000).decode('utf8')

def norm(raw,source):
    return {'source':source,'external_id':str(raw.get('external_id') or ''),'title':clean(raw.get('title')),
        'company':clean(raw.get('company')),'location':clean(raw.get('location')),
        'url':str(raw.get('url') or ''),'description':clean(raw.get('description'))[:12000],
        'posted':str(raw.get('posted') or ''),'employment_type':str(raw.get('employment_type') or ''),
        'duration':str(raw.get('duration') or ''),'discovery_class':str(raw.get('discovery_class') or 'ADVERTISED')}

def fetch_source(src):
    typ=src['type']; code=src.get('id',typ); limit=max(1,min(int(src.get('pages',2)),8))
    if typ=='arbeitnow':
        for p in range(1,limit+1):
            response=get_json('https://www.arbeitnow.com/api/job-board-api?page='+str(p))
            batch=[]
            for a in response.get('data',[]):
                batch.append(norm({'external_id':a.get('slug'),'title':a.get('title'),'company':a.get('company_name'),'location':a.get('location'),
                    'url':a.get('url'),'description':a.get('description'),'posted':a.get('created_at'),'employment_type':' '.join(a.get('job_types') or [])},code))
            yield batch
            if not response.get('links',{}).get('next') or not batch: break
    elif typ=='greenhouse':
        b=get_json('https://boards-api.greenhouse.io/v1/boards/'+urllib.parse.quote(src['board'])+'/jobs?content=true')
        yield [norm({'external_id':j.get('id'),'title':j.get('title'),'company':src.get('company',src['board']),
            'location':(j.get('location') or {}).get('name'),'description':j.get('content'), 'url':j.get('absolute_url'),'posted':j.get('updated_at')},code) for j in b.get('jobs',[])]
    elif typ=='lever':
        url='https://api.lever.co/v0/postings/'+urllib.parse.quote(src['board'])+'?mode=json'
        batch=get_json(url)
        yield [norm({'external_id':j.get('id'),'title':j.get('text'),'company':src.get('company',src['board']),
            'location':(j.get('categories') or {}).get('location'), 'description':j.get('descriptionPlain') or j.get('description'),
            'url':j.get('hostedUrl'),'employment_type':(j.get('categories') or {}).get('commitment')},code) for j in batch]
    elif typ=='ashby':
        b=get_json('https://api.ashbyhq.com/posting-api/job-board/'+urllib.parse.quote(src['board']))
        yield [norm({'external_id':j.get('id'),'title':j.get('title'),'company':src.get('company',src['board']),
            'location':j.get('location'),'description':j.get('descriptionPlain'),'url':j.get('jobUrl') or j.get('applyUrl'),
            'employment_type':j.get('employmentType')},code) for j in b.get('jobs',[])]
    elif typ=='personio':
        root=ET.fromstring(get_text('https://'+src['board']+'.jobs.personio.de/xml'))
        jobs=[]
        for j in root.findall('.//position'):
            def txt(k):return j.findtext(k,default='')
            jobs.append(norm({'external_id':txt('id'),'title':txt('name'),'company':src.get('company',src['board']),
                'location':txt('office'),'description':' '.join(j.itertext())[:12000],
                'url':'https://'+src['board']+'.jobs.personio.de/job/'+txt('id'),'employment_type':txt('employmentType')},code))
        yield jobs
    else: raise ValueError('Unsupported source: '+typ)

def atomic_json(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd, tmp=tempfile.mkstemp(prefix='.stage-',dir=str(path.parent))
    try:
        with os.fdopen(fd,'w',encoding='utf8') as f:
            json.dump(data,f,ensure_ascii=False,indent=2,sort_keys=True);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def load(path,default):return json.loads(path.read_text('utf8')) if path.exists() else default

def discover(cfg,path):
    db=load(path,{'schema':1,'jobs':{},'sources':{},'runs':[]})
    inserted=0; changed=0; source_failures=0
    for src in cfg['sources']:
        if not src.get('enabled',True):continue
        name=src.get('id',src['type']); observed=0
        try:
            for batch in fetch_source(src):
                for raw in batch:
                    if not raw['url'] or not raw['title']:continue
                    observed+=1; k=key_for(raw); old=db['jobs'].get(k)
                    fingerprint=digest(json.dumps(raw,ensure_ascii=False,sort_keys=True))
                    if old:
                        old['last_seen']=now();old['seen_count']=old.get('seen_count',1)+1
                        if old.get('fingerprint')!=fingerprint:
                            old.update(raw);old['fingerprint']=fingerprint;old['processing']='PENDING_EVALUATION';changed+=1
                    else:
                        db['jobs'][k]={**raw,'fingerprint':fingerprint,'first_seen':now(),'last_seen':now(),
                            'seen_count':1,'processing':'PENDING_EVALUATION','review_status':'NEW','score':None,'reason':'','eligibility':'UNKNOWN'}
                        inserted+=1
                # Checkpoint each successful source page BEFORE any LLM evaluation.
                atomic_json(path,db)
            db['sources'][name]={'last_success':now(),'count':observed,'error':None}
        except Exception as exc:
            source_failures+=1
            db['sources'][name]={'last_attempt':now(),'count':observed,'error':str(exc)[:350],
                                 'last_success':db['sources'].get(name,{}).get('last_success')}
        atomic_json(path,db)
    db['runs']= (db.get('runs',[])+[{'at':now(),'new':inserted,'changed':changed,'source_errors':source_failures}])[-48:]
    atomic_json(path,db)
    print(json.dumps({'stage':'discover','total':len(db['jobs']),'new':inserted,'changed':changed,'source_errors':source_failures}))

def classify(job,profile):
    title=slug(job.get('title')); body=slug(job.get('description')); both=title+' '+body
    negative_title=['ux designer','ui designer','product designer','graphic design','marketing','sales representative','finance transformation','hr intern','recruiter','accounting']
    if any(t in title for t in negative_title):return 0,'EXCLUDED_ROLE','Unrelated primary job family'
    if re.search(r'\b(senior|lead|principal|director|head of)\b',title):return 0,'EXCLUDED_SENIORITY','Experienced/senior position'
    kind=title+' '+slug(job.get('employment_type'))
    if not any(x in kind for x in ('intern','praktik','pflichtpraktik','student research')):
        return 0,'PASSIVE_NON_INTERNSHIP','Current search is internship-only'
    # Exclude only explicit required durations above the 3-month ceiling.
    duration_text=slug(job.get('duration'))+' '+both
    required_long = re.search(
        r'(?:\b(?:minimum|at least|mindestens|duration of contract|internship duration|dauer(?: des praktikums)?)\b)'
        r'[^.;\n]{0,32}\b(?:4|5|6|7|8|9|10|11|12)\s*(?:[-–]\s*\d+|to\s*\d+)?\s*(?:months|monate)\b',
        duration_text)
    long_range = re.search(r'\b(?:4|5|6|7|8|9|10|11|12)\s*(?:[-–]|to)\s*\d+\s*(?:months|monate)\b',duration_text)
    if required_long or long_range:
        return 0,'EXCLUDED_DURATION','Published internship minimum duration exceeds 3 months (verify before permanent exclusion)'
    if re.search(r'(?:fluent|excellent|verhandlungssicher|fließend)\s+(?:in\s+)?german|german\s+(?:c1|c2)',both):
        return 0,'LANGUAGE_REVIEW','Explicit high German proficiency requirement; human review required'
    quantum=['quantum','quanten','qiskit','qkd','photon','optics','optik','semiconductor','halbleiter','qubit']
    physical=['embedded','firmware','sensor','signal processing','simulation','test automation','validation','microwave','rf ','radar','hardware','messtechnik','measurement','laboratory','instrument']
    software=['python','machine learning','pytorch','computer vision','scientific software','optimization','datenanalyse','algorithm']
    q=sum(w in both for w in quantum);p=sum(w in both for w in physical);s=sum(w in both for w in software)
    # No prestige-only promotion; scoring is transparent pre-LLM heuristic, not a probability.
    score=min(98,28+min(q,4)*10+min(p,4)*8+min(s,3)*6)
    focus=profile.get('locations',[])[:3]
    if any(slug(city) in slug(job.get('location')) for city in focus):score=min(98,score+8)
    if job['company'].casefold() in [str(x).casefold() for x in profile.get('priority_companies',[])]:score=min(98,score+5)
    if q==0 and p==0 and s<2:return min(score,30),'LOW_FIT','Insufficient technical alignment'
    return score,'DURATION_UNVERIFIED','Strongest signals: quantum=%s, physical=%s, software=%s; duration and academic recognition require checking'%(q,p,s)

def ask_groq(job,profile):
    key=os.environ.get('GROQ_API_KEY')
    if not key:return None
    brief={'candidate':{'degree_focus':profile.get('focus'),'technical_tracks':profile.get('tracks'),'german_level':profile.get('german_level'),
                        'max_duration_months':profile.get('max_duration_months',3)},
           'job':{k:job.get(k) for k in ('title','company','location','description','duration','employment_type')}}
    model=os.environ.get('GROQ_MODEL') or 'llama-3.3-70b-versatile'
    payload={'model':model,'temperature':0,'response_format':{'type':'json_object'},'messages':[
      {'role':'system','content':'Evaluate technical internship fit conservatively. Return valid JSON with numeric score 0-100, short reason, and eligibility one of MATCH_REVIEW, DURATION_REVIEW, LANGUAGE_REVIEW, EXCLUDED. Never invent requirements.'},
      {'role':'user','content':json.dumps(brief,ensure_ascii=False)[:10500]}]}
    req=urllib.request.Request('https://api.groq.com/openai/v1/chat/completions',data=json.dumps(payload).encode(),
        headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req,timeout=35) as resp:b=json.loads(resp.read().decode())
    parsed=json.loads(b['choices'][0]['message']['content'])
    score=float(parsed['score']);assert 0<=score<=100
    return {'score':round(score),'reason':str(parsed.get('reason',''))[:500], 'eligibility':parsed.get('eligibility','DURATION_REVIEW')}

def evaluate(cfg,path):
    db=load(path,{'jobs':{}}); profile=cfg.get('profile',{})
    processed=0;errors=0
    max_llm=max(0,int(cfg.get('max_llm_per_run',25)))
    evaluated_with_llm=0
    for k,j in db.get('jobs',{}).items():
        if j.get('processing') not in ('PENDING_EVALUATION','RETRY_EVALUATION'):continue
        score,eligibility,reason=classify(j,profile)
        j.update(score=score,eligibility=eligibility,reason=reason,evaluator='rules-v1')
        if eligibility=='DURATION_UNVERIFIED' and os.environ.get('GROQ_API_KEY') and evaluated_with_llm<max_llm:
            try:
                extra=ask_groq(j,profile); evaluated_with_llm+=1
                if extra:
                    j['score']=round(.55*score+.45*extra['score']);j['reason']=reason+' | LLM: '+extra['reason']
                    j['evaluator']='rules+groq';j['eligibility']=extra['eligibility']
            except Exception as exc:
                errors+=1;j['reason']=reason+' | LLM deferred: '+type(exc).__name__
                j['processing']='RETRY_EVALUATION';atomic_json(path,db);continue
        j['processing']='EVALUATED';j['evaluated_at']=now();processed+=1
        if processed%20==0:atomic_json(path,db)
    atomic_json(path,db)
    print(json.dumps({'stage':'evaluate','processed':processed,'retry':errors,'total':len(db['jobs'])}))

def ranked(db):
    j=list(db.get('jobs',{}).values())
    # REVIEWED/SUBMITTED never silently reverted; display all and focus sorted.
    return sorted(j,key=lambda a:(a.get('score') or 0,a.get('first_seen','')),reverse=True)

def export_rows(db):
    # First five is a view, never a truncation. Match the 10-column manual-friendly Inbox.
    rows=[['Company','Role','Location','Fit','Eligibility','Decision','Source link','Verified date','Next action','Notes']]
    for j in ranked(db):
        if (j.get('score') or 0)<40 or j.get('eligibility','').startswith(('EXCLUDED','PASSIVE')):continue
        rows.append([j.get('company'),j.get('title'),j.get('location'),j.get('score'),j.get('eligibility'),j.get('review_status','NEW'),
                     j.get('url'),j.get('last_seen','')[:10],'Verify official ATS duration / QTEC recognition',j.get('reason','')[:400]])
    return rows

def export_sheets(db, cfg):
    # Explicit one-time secret configuration is required. Never mutate existing manual trackers.
    target=os.environ.get('JOB_SHEET_ID','')
    raw=os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON','')
    if not target or not raw:
        print('Google Sheets sync skipped: JOB_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_JSON not configured')
        return False
    import gspread
    from google.oauth2.service_account import Credentials
    creds=Credentials.from_service_account_info(json.loads(raw),scopes=['https://www.googleapis.com/auth/spreadsheets'])
    sh=gspread.authorize(creds).open_by_key(target)
    ws=sh.worksheet('Inbox')
    # Only automation-owned tab, not user-managed Status/Notes.
    rows=export_rows(db)
    # Carry over manual review statuses and notes for the same immutable source URL.
    prior=ws.get_all_values()
    prior_by_url={r[6].strip():(r[5],r[8],r[9]) for r in prior[1:] if len(r)>=10 and r[6].strip()}
    for row in rows[1:]:
        saved=prior_by_url.get(row[6])
        if saved:
            if saved[0] and saved[0] not in ('NEW','Not Reviewed'):row[5]=saved[0]
            if saved[1] and saved[1]!='Verify official ATS duration / QTEC recognition':row[8]=saved[1]
            if saved[2] and saved[2] not in row[9]:row[9]+=' | User: '+saved[2][:150]
    ws.clear();ws.update(range_name='A1',values=rows, value_input_option='RAW')
    print('Google Sheets sync complete:',len(rows)-1)
    return True

def main():
    pa=argparse.ArgumentParser();pa.add_argument('mode',choices=['discover','evaluate','export','report']);
    pa.add_argument('--config',required=True);pa.add_argument('--state',required=True);args=pa.parse_args()
    cfg=load(Path(args.config),{});state=Path(args.state)
    if args.mode=='discover':discover(cfg,state)
    elif args.mode=='evaluate':evaluate(cfg,state)
    elif args.mode=='export':export_sheets(load(state,{'jobs':{}}),cfg)
    else:
        d=load(state,{'jobs':{},'sources':{}})
        print(json.dumps({'count':len(d['jobs']),'sources':d['sources'],'shortlist':export_rows(d)[:6]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
