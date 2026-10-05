"""Deterministic monthly snapshot builder. No network calls.
Use --raw-dir/--output for staged refreshes. Recent prices must cover every
published NYSE session for a completed month. Provisional workbook rows are excluded.
"""
import argparse, calendar, csv, datetime as dt, hashlib, json, math
from collections import defaultdict
from pathlib import Path
import xlrd
ROOT=Path(__file__).resolve().parents[1]

def finite(value, positive=False):
    try:
        number=float(value)
        return number if math.isfinite(number) and (not positive or number>0) else None
    except (TypeError,ValueError): return None

def last_complete_month(as_of):
    return (as_of.replace(day=1)-dt.timedelta(days=1)).strftime('%Y-%m')

def expected_sessions(month):
    year,number=map(int,month.split('-'))
    reference=json.loads((ROOT/'data'/'trading-calendar.json').read_text())
    holidays=reference['holiday_dates'].get(str(year))
    if holidays is None: raise ValueError(f'No checked exchange calendar for {year}; update trading-calendar.json first')
    return {dt.date(year,number,day).isoformat() for day in range(1,calendar.monthrange(year,number)[1]+1) if dt.date(year,number,day).weekday()<5 and dt.date(year,number,day).isoformat() not in holidays}

def aggregate(path,column,date_format,minimum):
    groups=defaultdict(list);seen=set()
    with path.open(newline='',encoding='utf-8-sig') as stream:
        for row in csv.DictReader(stream):
            value=finite(row.get(column))
            if value is None:continue
            day=dt.datetime.strptime(next(iter(row.values())),date_format).date().isoformat()
            if day in seen:raise ValueError(f'Duplicate observation in {path.name}: {day}')
            seen.add(day);groups[day[:7]].append(value)
    return {month:{'value':round(sum(values)/len(values),6),'count':len(values)} for month,values in groups.items() if len(values)>=minimum}

def recent_prices(path,as_of):
    if not path.exists():return {}
    groups=defaultdict(dict)
    with path.open(newline='',encoding='utf-8-sig') as stream:
        reader=csv.DictReader(stream)
        if reader.fieldnames!=['Date','Close']:raise ValueError('Recent prices require Date,Close CSV columns')
        for row in reader:
            day=dt.date.fromisoformat(row['Date']).isoformat();value=finite(row['Close'],True)
            if value is None:raise ValueError('Invalid daily close')
            if day[:7]>last_complete_month(as_of):continue
            if day in groups[day[:7]]:raise ValueError('Duplicate recent trading date')
            groups[day[:7]][day]=value
    result={}
    for month,days in groups.items():
        expected=expected_sessions(month)
        if set(days)!=expected:
            raise ValueError(f'Incomplete monthly prices for {month}: missing {sorted(expected-set(days))}, extra {sorted(set(days)-expected)}')
        result[month]={'value':round(sum(days.values())/len(days),6),'count':len(days)}
    return result

def read_workbook(path,as_of):
    sheet=xlrd.open_workbook(str(path)).sheet_by_name('Data')
    headers=[str(value).strip() for value in sheet.row_values(7)]
    for index,name in [(0,'Date'),(1,'P'),(6,'Rate GS10'),(12,'CAPE')]:
        if headers[index]!=name:raise ValueError(f'Workbook schema changed at {index}: {headers[index]}')
    rows=[]
    for index in range(8,sheet.nrows):
        cells=sheet.row_values(index);date_value=finite(cells[0])
        if date_value is None:continue
        year=int(date_value);month=round((date_value-year)*100)
        if not 1<=month<=12:raise ValueError('Invalid workbook month')
        date=f'{year:04d}-{month:02d}'
        rows.append({'date':date,'price':finite(cells[1],True),'cape':finite(cells[12],True),'long_rate':finite(cells[6]),'price_source':'shiller','price_observations':None})
    if any(r['price'] is None for r in rows):raise ValueError('Invalid workbook price')
    # Identify the publisher's final provisional month BEFORE filtering by as_of.
    # Otherwise an October provisional row could incorrectly remove September.
    notes=' '.join(str(cell) for cell in sheet.row_values(sheet.nrows-1))
    provisional=rows[-1]['date'] if 'price is' in notes.lower() else None
    rows=[r for r in rows if r['date']<as_of.strftime('%Y-%m') and r['date']!=provisional]
    return rows,provisional,notes

def build(as_of,raw_dir=None,output=None,require_fresh=False):
    raw=Path(raw_dir or ROOT/'data'/'raw')
    manifest=json.loads((raw/'manifest.json').read_text(encoding='utf-8'))
    prices,provisional,workbook_notes=read_workbook(raw/'shiller.xls',as_of)
    complete_book_end=prices[-1]['date']
    supplement=recent_prices(raw/'sp500-recent.csv',as_of)
    for date,item in sorted(supplement.items()):
        if date<=complete_book_end:continue
        prices.append({'date':date,'price':item['value'],'cape':None,'long_rate':None,'price_source':'recent_price','price_observations':item['count']})
    for previous,current in zip(prices,prices[1:]):
        p=dt.date.fromisoformat(previous['date']+'-01');expected=(p.replace(day=28)+dt.timedelta(days=4)).replace(day=1).strftime('%Y-%m')
        if current['date']!=expected:raise ValueError(f'Price gap between {previous["date"]} and {current["date"]}')
    expected_end=last_complete_month(as_of)
    if require_fresh and prices[-1]['date']!=expected_end:raise ValueError(f'Price series ends {prices[-1]["date"]}, expected completed month {expected_end}; supply a verified Date,Close supplement')
    series={'curve':aggregate(raw/'curve.csv','T10Y3M','%Y-%m-%d',10),'stress':aggregate(raw/'stress.csv','STLFSI4','%Y-%m-%d',3),'vix':aggregate(raw/'vix.csv','CLOSE','%m/%d/%Y',10)}
    for row in prices:
        for key,items in series.items():
            item=items.get(row['date']);row[key]=item['value'] if item else None;row[key+'_observations']=item['count'] if item else 0
        if row['cape'] is not None:row['cape']=round(row['cape'],6)
    sources=[
        {'id':'shiller','name':'Robert Shiller · Current stock-market workbook','url':'https://shillerdata.com/','download':manifest['shiller_download'],'file':'shiller.xls','definition':'Nominal S&P composite monthly averages and author-provided CAPE. Provisional final month excluded.','note':f'Completed workbook prices end {complete_book_end}. Provisional month {provisional} is excluded for price, CAPE and long rate. Publisher notes: {workbook_notes.strip()}. Dividend reinvestment is not included.'},
        {'id':'vix','name':'Cboe · VIX daily history','url':'https://www.cboe.com/tradable_products/vix/vix_historical_data','download':'https://cdn-api.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv','file':'vix.csv','definition':'Monthly arithmetic mean of daily CLOSE, minimum 10 observations.','note':'Daily history begins in 1990; monthly averages smooth short volatility spikes.'},
        {'id':'curve','name':'Federal Reserve Bank of St. Louis · T10Y3M','url':'https://fred.stlouisfed.org/series/T10Y3M','download':manifest.get('curve_download','https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y3M'),'file':'curve.csv','definition':'Monthly arithmetic mean of daily 10-year minus 3-month Treasury spread, minimum 10 observations.','note':'Recession prediction and an equity-price-decline target are different questions.'},
        {'id':'stress','name':'Federal Reserve Bank of St. Louis · STLFSI4','url':'https://fred.stlouisfed.org/series/STLFSI4','download':manifest.get('stress_download','https://fred.stlouisfed.org/graph/fredgraph.csv?id=STLFSI4'),'file':'stress.csv','definition':'Monthly arithmetic mean of weekly financial stress, minimum 3 observations.','note':'Current-vintage revised composite with full-sample normalization, not an archive of historical real-time releases.'}
    ]
    if supplement:
        sources.append({'id':'recent_price','name':'S&P 500 daily closes · Yahoo Finance','url':manifest['recent_price_source'],'download':manifest['recent_price_source'],'file':'sp500-recent.csv','definition':'Complete-month arithmetic mean of daily index CLOSE values. Dates must exactly match the checked NYSE trading calendar. Supplements only months after completed workbook coverage.','note':manifest['recent_price_acquisition'],'retrieved_at':manifest.get('recent_price_verified_at',manifest['retrieved_at'])})
    for source in sources:
        source.setdefault('retrieved_at',manifest['retrieved_at']);source['sha256']=hashlib.sha256((raw/source['file']).read_bytes()).hexdigest();source['bytes']=(raw/source['file']).stat().st_size
    coverage={key:{'first':next((r['date'] for r in prices if r[key] is not None),None),'last':next((r['date'] for r in reversed(prices) if r[key] is not None),None),'count':sum(r[key] is not None for r in prices)} for key in ['price','cape','vix','curve','stress']}
    freshness={'expected_last_complete_month':expected_end,'price_current':prices[-1]['date']==expected_end,'shiller_complete_month':complete_book_end,'shiller_provisional_month':provisional,'supplement_months':[r['date'] for r in prices if r['price_source']=='recent_price']}
    result={'schema_version':2,'snapshot_date':manifest['retrieved_at'],'as_of':as_of.isoformat(),'frequency':'monthly','freshness':freshness,'coverage':coverage,'sources':sources,'rows':prices}
    destination=Path(output or ROOT/'data'/'snapshot.json');destination.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps({'rows':len(prices),'coverage':coverage,'freshness':freshness},indent=2));return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--as-of',type=dt.date.fromisoformat,required=True);parser.add_argument('--raw-dir',type=Path);parser.add_argument('--output',type=Path);parser.add_argument('--require-fresh',action='store_true')
    args=parser.parse_args();build(args.as_of,args.raw_dir,args.output,args.require_fresh)
