"""Refresh public source snapshots, validate, then replace the derived snapshot.
Run: python scripts/refresh_data.py --as-of YYYY-MM-DD
If a quote endpoint is rate-limited, supply --recent-prices verified.csv and
--recent-source its public source URL. A stale result fails instead of publishing.
This command does not commit, push, schedule, or send messages.
"""
import argparse, csv, datetime as dt, hashlib, html, io, json, shutil, subprocess, sys, tempfile, urllib.error, urllib.parse, urllib.request
from pathlib import Path
from build_data import ROOT, build, last_complete_month, read_workbook

def fetch(url,destination):
    if urllib.parse.urlparse(url).scheme!='https':raise ValueError('Only HTTPS sources are allowed')
    try:
        with urllib.request.urlopen(url,timeout=20) as response:body=response.read()
    except urllib.error.HTTPError as error:
        # Respect a provider rate limit; do not retry it through another stack.
        if error.code==429:raise RuntimeError('Provider rate-limited this request. Use a verified daily-close CSV or retry later.') from error
        raise
    except (urllib.error.URLError,TimeoutError):
        command=['curl','--silent','--show-error','--location','--fail','--max-time','30',url]
        response=subprocess.run(command,capture_output=True)
        if response.returncode and sys.platform=='win32' and shutil.which('wsl'):
            code='import sys,urllib.request;sys.stdout.buffer.write(urllib.request.urlopen(sys.argv[1],timeout=25).read())'
            response=subprocess.run(['wsl','--exec','python3','-c',code,url],capture_output=True)
        if response.returncode:raise RuntimeError('Source download failed: '+url)
        body=response.stdout
    destination.write_bytes(body)

def publisher_download(page):
    import re
    candidates=[html.unescape(u) for u in re.findall(r'href=["\x27]([^"\x27]+)',page) if 'ie_data.xls' in u.lower()]
    if len(candidates)!=1:raise ValueError('Publisher workbook link missing or ambiguous')
    url=urllib.parse.urljoin('https://shillerdata.com/',candidates[0])
    host=urllib.parse.urlparse(url).hostname or ''
    if urllib.parse.urlparse(url).scheme!='https' or not (host.endswith('.wsimg.com') or host=='shillerdata.com'):raise ValueError('Unexpected publisher download host')
    return url

def quote_csv(payload,destination):
    result=payload['chart']['result'][0]
    if result['meta']['symbol']!='^GSPC':raise ValueError('Unexpected quote symbol')
    timestamps=result['timestamp'];closes=result['indicators']['quote'][0]['close']
    if len(timestamps)!=len(closes):raise ValueError('Unequal quote arrays')
    with destination.open('w',newline='',encoding='utf-8') as stream:
        writer=csv.writer(stream,lineterminator='\n');writer.writerow(['Date','Close'])
        for stamp,price in zip(timestamps,closes):
            if price is not None:writer.writerow([dt.datetime.fromtimestamp(stamp,dt.timezone.utc).date().isoformat(),price])

def refresh(as_of,recent_file=None,recent_source=None,override=None):
    raw=ROOT/'data'/'raw';cache=ROOT/'.data';cache.mkdir(exist_ok=True)
    previous=json.loads((raw/'manifest.json').read_text()) if (raw/'manifest.json').exists() else {}
    with tempfile.TemporaryDirectory(prefix='refresh-',dir=cache) as directory:
        stage=Path(directory).resolve()
        if stage.parent!=cache.resolve():raise ValueError('Unexpected staging path')
        if override:
            host=urllib.parse.urlparse(override).hostname or ''
            if not host.endswith('.wsimg.com'):raise ValueError('Workbook override must use the publisher file host')
            workbook_url=override
        else:
            fetch('https://shillerdata.com/',stage/'publisher.html');workbook_url=publisher_download((stage/'publisher.html').read_text(encoding='utf-8'))
        fetch(workbook_url,stage/'shiller.xls')
        end=(as_of.replace(day=1)-dt.timedelta(days=1)).isoformat()
        urls={'curve.csv':'https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y3M&cosd=1982-01-01&coed='+end,'stress.csv':'https://fred.stlouisfed.org/graph/fredgraph.csv?id=STLFSI4&cosd=1993-01-01&coed='+end,'vix.csv':'https://cdn-api.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv'}
        for filename,url in urls.items():fetch(url,stage/filename)
        manifest={'retrieved_at':dt.datetime.now(dt.timezone.utc).date().isoformat(),'shiller_download':workbook_url,'curve_download':urls['curve.csv'],'stress_download':urls['stress.csv']}
        book,_,_=read_workbook(stage/'shiller.xls',as_of)
        if book[-1]['date']<last_complete_month(as_of):
            if recent_file:
                candidate=Path(recent_file).read_bytes();(stage/'sp500-recent.csv').write_bytes(candidate)
                existing=raw/'sp500-recent.csv'
                if existing.exists() and candidate==existing.read_bytes():
                    for key in ['recent_price_source','recent_price_acquisition','recent_price_verified_at']:manifest[key]=previous[key]
                else:
                    if not recent_source:raise ValueError('A new supplied CSV requires --recent-source for attribution')
                    manifest.update(recent_price_source=recent_source,recent_price_acquisition='Operator-supplied daily-close CSV. Full expected NYSE session coverage is checked by the builder; source correctness requires operator review.',recent_price_verified_at=as_of.isoformat())
            else:
                date=dt.date.fromisoformat(book[-1]['date']+'-01');start=(date.replace(day=28)+dt.timedelta(days=4)).replace(day=1)
                epoch=lambda d:int(dt.datetime.combine(d,dt.time(),dt.timezone.utc).timestamp())
                url='https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1='+str(epoch(start))+'&period2='+str(epoch(as_of.replace(day=1)))+'&interval=1d'
                fetch(url,stage/'quote.json');quote_csv(json.loads((stage/'quote.json').read_text()),stage/'sp500-recent.csv')
                manifest.update(recent_price_source='https://finance.yahoo.com/quote/%5EGSPC/history/',recent_price_acquisition='Daily index closes from the public chart endpoint. Full expected NYSE sessions validated.',recent_price_verified_at=as_of.isoformat())
        (stage/'manifest.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode('utf-8'))
        result=build(as_of,stage,stage/'snapshot.json',require_fresh=True)
        existing_snapshot=ROOT/'data'/'snapshot.json'
        if existing_snapshot.exists():
            old=json.loads(existing_snapshot.read_text());
            if result['coverage']['price']['last']<old['coverage']['price']['last']:raise ValueError('Refresh would regress published coverage')
        # All parsing and coverage guards have passed before touching committed inputs.
        filenames=['shiller.xls','curve.csv','stress.csv','vix.csv','manifest.json']
        if (stage/'sp500-recent.csv').exists():filenames.append('sp500-recent.csv')
        for filename in filenames:
            target=raw/filename
            if target.resolve().parent!=raw.resolve():raise ValueError('Unexpected output path')
            temporary=target.with_suffix(target.suffix+'.new');temporary.write_bytes((stage/filename).read_bytes());temporary.replace(target)
        temporary=existing_snapshot.with_suffix('.json.new');temporary.write_bytes((stage/'snapshot.json').read_bytes());temporary.replace(existing_snapshot)
        print('Refreshed through '+result['coverage']['price']['last']+'. Review the diff and run npm test before publishing.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--as-of',type=dt.date.fromisoformat,required=True);parser.add_argument('--recent-prices',type=Path);parser.add_argument('--recent-source');parser.add_argument('--shiller-url')
    args=parser.parse_args()
    try:refresh(args.as_of,args.recent_prices,args.recent_source,args.shiller_url)
    except Exception as error:raise SystemExit('Refresh stopped: '+str(error))
