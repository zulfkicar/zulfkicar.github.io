"""Build a monthly research snapshot from checked-in primary-source files.
Run: python scripts/build_data.py --as-of 2026-10-05
Requires xlrd==2.0.2. No network requests are made by this builder.
"""
import argparse, csv, datetime as dt, hashlib, json, math
from collections import defaultdict
from pathlib import Path
import xlrd

ROOT=Path(__file__).resolve().parents[1]

def finite(value, positive=False):
    try:
        number=float(value)
        return number if math.isfinite(number) and (not positive or number>0) else None
    except (TypeError,ValueError): return None

def aggregate(path, column, date_format, minimum):
    groups=defaultdict(list)
    with path.open(newline='',encoding='utf-8-sig') as stream:
        for row in csv.DictReader(stream):
            value=finite(row.get(column))
            if value is None: continue
            day=dt.datetime.strptime(next(iter(row.values())),date_format).date()
            groups[day.strftime('%Y-%m')].append(value)
    return {month:{'value':round(sum(values)/len(values),6),'count':len(values)} for month,values in groups.items() if len(values)>=minimum}

def build(as_of):
    raw=ROOT/'data'/'raw'
    sheet=xlrd.open_workbook(str(raw/'shiller.xls')).sheet_by_name('Data')
    prices=[]
    for row in range(8,sheet.nrows):
        cells=sheet.row_values(row)
        date_value=finite(cells[0])
        if date_value is None: continue
        year=int(date_value);month=round((date_value-year)*100)
        if not 1<=month<=12: raise ValueError('Invalid workbook month')
        date=f'{year:04d}-{month:02d}'
        if date>=as_of.strftime('%Y-%m'): continue
        price=finite(cells[1],True)
        if price is None: raise ValueError('Invalid price')
        prices.append({'date':date,'price':round(price,6),'cape':finite(cells[12],True),'long_rate':finite(cells[6])})
    # The supplied workbook explicitly says its last price/rate are September 1 values.
    # Exclude that provisional row from monthly-average analysis.
    notes=' '.join(str(cell) for cell in sheet.row_values(sheet.nrows-1))
    excluded=None
    if 'price is' in notes.lower(): excluded=prices.pop()['date']
    curve=aggregate(raw/'curve.csv','T10Y3M','%Y-%m-%d',10)
    stress=aggregate(raw/'stress.csv','STLFSI4','%Y-%m-%d',3)
    vix=aggregate(raw/'vix.csv','CLOSE','%m/%d/%Y',10)
    for row in prices:
        for key,series in [('curve',curve),('stress',stress),('vix',vix)]:
            item=series.get(row['date'])
            row[key]=item['value'] if item else None
            row[key+'_observations']=item['count'] if item else 0
        if row['cape'] is not None: row['cape']=round(row['cape'],6)
    sources=[
        {'id':'shiller','name':'Robert Shiller · U.S. stock-market workbook','url':'https://www.econ.yale.edu/~shiller/data.htm','download':'http://www.econ.yale.edu/~shiller/data/ie_data.xls','file':'shiller.xls','definition':'Nominal S&P composite price, monthly averages. CAPE as provided by the author. Historical constituents differ before the modern S&P 500.','note':f'Workbook ends at {excluded or prices[-1]["date"]}. Provisional final observation excluded: {excluded}. Dividend reinvestment is not included in these price comparisons.'},
        {'id':'vix','name':'Cboe · VIX daily history','url':'https://www.cboe.com/tradable_products/vix/vix_historical_data','download':'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv','file':'vix.csv','definition':'Arithmetic monthly mean of daily VIX CLOSE observations, at least 10 per month.','note':'VIX history begins in 1990. Monthly averages do not preserve intraday spikes.'},
        {'id':'curve','name':'Federal Reserve Bank of St. Louis · T10Y3M','url':'https://fred.stlouisfed.org/series/T10Y3M','download':'https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y3M&cosd=1982-01-01&coed=2026-09-30','file':'curve.csv','definition':'Arithmetic monthly mean of daily 10-year minus 3-month Treasury spread, percentage points. At least 10 observations.','note':'The yield curve is commonly studied for recession prediction. This app separately tests a price-decline target, not recession prediction.'},
        {'id':'stress','name':'Federal Reserve Bank of St. Louis · STLFSI4','url':'https://fred.stlouisfed.org/series/STLFSI4','download':'https://fred.stlouisfed.org/graph/fredgraph.csv?id=STLFSI4&cosd=1993-01-01&coed=2026-09-30','file':'stress.csv','definition':'Arithmetic monthly mean of weekly financial-stress index observations, at least 3 per month.','note':'A revised composite with a full-sample normalization. These are current-vintage observations, not what was necessarily published at each historical date.'}
    ]
    for source in sources:
        source['retrieved_at']='2026-10-05'
        source['sha256']=hashlib.sha256((raw/source['file']).read_bytes()).hexdigest()
        source['bytes']=(raw/source['file']).stat().st_size
    coverage={key:{'first':next((r['date'] for r in prices if r[key] is not None),None),'last':next((r['date'] for r in reversed(prices) if r[key] is not None),None),'count':sum(r[key] is not None for r in prices)} for key in ['price','cape','vix','curve','stress']}
    result={'schema_version':1,'snapshot_date':'2026-10-05','as_of':as_of.isoformat(),'frequency':'monthly','provisional_price_month_excluded':excluded,'coverage':coverage,'sources':sources,'rows':prices}
    (ROOT/'data'/'snapshot.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps({'rows':len(prices),'coverage':coverage,'excluded':excluded},indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--as-of',type=dt.date.fromisoformat,required=True)
    build(parser.parse_args().as_of)
