"""Read-only PakMarkets -> bounded Crash Lab monthly research summaries.
No upstream imports, writes, downloads, or dataset release. Publishes aggregate
counts and macro summaries only; not the raw equity panel or a synthetic KSE100.
"""
import argparse,datetime as dt,hashlib,json,math
from pathlib import Path
import numpy as np
import pandas as pd
import pyarrow.parquet as pq
ROOT=Path(__file__).resolve().parents[1]

TABLES=['prices.adjusted_history','strict.psx_index_snapshot_aggregate_feature_v1','core.sbp_macro_observation_snapshot']

def last_weekday(year,month):
    end=(dt.date(year,month,28)+dt.timedelta(days=4)).replace(day=1)-dt.timedelta(days=1)
    while end.weekday()>4:end-=dt.timedelta(days=1)
    return end

def closed_cutoff(last_date,weekly=False):
    date=pd.Timestamp(last_date).date();end=last_weekday(date.year,date.month)
    if weekly:
        end=(dt.date(date.year,date.month,28)+dt.timedelta(days=4)).replace(day=1)-dt.timedelta(days=1)
        while end.weekday()!=date.weekday():end-=dt.timedelta(days=1)
    if date<end:return (date.replace(day=1)-dt.timedelta(days=1)).strftime('%Y-%m')
    return date.strftime('%Y-%m')

def supported_months(daily):
    # Keys are observed codes and declared adjustment segments, not issuer IDs.
    d=daily.copy();d['trading_date']=pd.to_datetime(d.trading_date);d['month']=d.trading_date.dt.to_period('M').astype(str)
    required=d.retrospective_price_eligible.fillna(False)&d.gross_return_eligible.fillna(False)&(d.traded_volume_shares_raw>0)&(d.close_distribution_adjusted>0)
    d=d[required].copy()
    if d.duplicated(['source_symbol','trading_date']).any():raise ValueError('Duplicate adjusted code/date rows')
    cutoff=closed_cutoff(daily.trading_date.max());d=d[d.month<=cutoff]
    group=d.groupby(['source_symbol','month'],sort=True)
    m=group.agg(price=('close_distribution_adjusted','mean'),observations=('close_distribution_adjusted','size'),segments=('adjustment_segment','nunique'),segment=('adjustment_segment','first')).reset_index()
    m=m[(m.observations>=10)&(m.segments==1)].copy();m['month_number']=pd.PeriodIndex(m.month,freq='M').asi8
    results=[]
    for _,code in m.groupby('source_symbol',sort=True):
        code=code.sort_values('month_number').reset_index(drop=True)
        for i in range(11,len(code)):
            window=code.iloc[i-11:i+1]
            if window.month_number.iloc[-1]-window.month_number.iloc[0]!=11 or window.segment.nunique()!=1:continue
            price=float(window.price.iloc[-1]);mean10=float(window.price.iloc[-10:].mean());peak=float(window.price.max());past6=float(window.price.iloc[-7])
            results.append({'date':window.month.iloc[-1],'code':window.source_symbol.iloc[-1],'below_trend':price<mean10,'below_peak_pct':100*(1-price/peak),'change6_pct':100*(price/past6-1),'observations':int(window.observations.iloc[-1])})
    detail=pd.DataFrame(results)
    if detail.empty:raise ValueError('No supported rolling histories')
    rows=[]
    for month,x in detail.groupby('date',sort=True):
        rows.append({'date':month,'eligible_codes':int(len(x)),'below_trend_count':int(x.below_trend.sum()),'peak_drop_counts':{str(cut):int((x.below_peak_pct>=cut-1e-9).sum()) for cut in [10,20,30,40]},'median_change6_pct':round(float(x.change6_pct.median()),4),'supported_quote_rows':int(x.observations.sum())})
    return rows,{'raw_last_date':str(pd.Timestamp(daily.trading_date.max()).date()),'complete_month_cutoff':cutoff,'retained_reviewed_codes':int(daily.source_symbol.nunique()),'supported_traded_rows':int(len(d)),'rolling_codes':int(detail.code.nunique())}

def macro_months(observations):
    specs={'fx':('PK_USD_PKR_BANK_FLOATING_DAILY_AVG','PKR_PER_USD',0,10,False),'reserves':('PK_FX_RESERVES_SBP_USD_M','USD',6,3,True)}
    rows={};coverage={}
    for key,(sid,unit,scale,minimum,weekly) in specs.items():
        x=observations[observations.series_id==sid].copy();x['date']=pd.to_datetime(x.reference_period_start);x['number']=pd.to_numeric(x.value)
        if x.empty or set(x.unit_code)!={unit} or set(x.scale_power10)!={scale}:raise ValueError('Unexpected macro definition for '+sid)
        if x.date.duplicated().any():raise ValueError('Duplicate macro reference dates')
        cutoff=closed_cutoff(x.date.max(),weekly);x['month']=x.date.dt.to_period('M').astype(str);usable=x[x.month<=cutoff]
        grouped=usable.groupby('month').agg(value=('number','mean'),count=('number','size'));grouped=grouped[grouped['count']>=minimum]
        values={month:float(row.value) for month,row in grouped.iterrows()}
        for month,row in grouped.iterrows():
            item=rows.setdefault(month,{'date':month});item[key]=round(float(row.value)/(1000 if key=='reserves' else 1),6);item[key+'_observations']=int(row['count'])
            earlier=str(pd.Period(month,freq='M')-6);previous=values.get(earlier)
            item[key+'_change6_pct']=round(100*(float(row.value)/previous-1),4) if previous and all(str(pd.Period(month,freq='M')-i) in values for i in range(7)) else None
        coverage[key]={'reference_first':str(x.date.min().date()),'reference_last':str(x.date.max().date()),'monthly_first':grouped.index.min(),'monthly_last':grouped.index.max(),'minimum_observations':minimum,'definition':'Mean retained observations. Trailing incomplete source month excluded.'}
    policy=observations[observations.series_id=='PK_SBP_POLICY_TARGET_RATE_PA_PCT'].copy();policy['date']=pd.to_datetime(policy.reference_period_start);policy['number']=pd.to_numeric(policy.value)
    if set(policy.unit_code)!={'PERCENT_PA'} or set(policy.scale_power10)!={0}:raise ValueError('Unexpected policy units')
    if policy.date.duplicated().any():raise ValueError('Duplicate policy-event dates')
    policy=policy.sort_values('date');events=[{'date':str(r.date.date()),'value':float(r.number)} for r in policy.itertuples()]
    coverage['policy']={'reference_first':events[0]['date'],'reference_last':events[-1]['date'],'definition':'Last recorded change event at or before month-end. Retained event history, not a verified monthly-average or publication-time record.'}
    return list(rows.values()),coverage,events

def concentration_months(snapshots):
    names={'KSE 100 Index','KSE-100'};x=snapshots[snapshots.index_sheet_name.isin(names)].copy();x['date']=pd.to_datetime(x.snapshot_date);x['month']=x.date.dt.to_period('M').astype(str)
    if x.date.duplicated().any():raise ValueError('More than one retained KSE100 sheet for a date')
    cutoff=closed_cutoff(x.date.max());ok=(x.month<=cutoff)&(x.psx_index_constituent_count==100)&(x.psx_index_weight_sum_pct.between(98,102))&(x['psx_index_top5_weight_pct__status_code']=='ELIGIBLE')
    valid=x[ok];g=valid.groupby('month').agg(value=('psx_index_top5_weight_pct','mean'),count=('psx_index_top5_weight_pct','size'));g=g[g['count']>=10]
    rows=[{'date':month,'top5_weight_pct':round(float(row.value),4),'snapshot_count':int(row['count'])} for month,row in g.iterrows()]
    return rows,{'reference_first':str(x.date.min().date()),'reference_last':str(x.date.max().date()),'monthly_first':rows[0]['date'],'monthly_last':rows[-1]['date'],'definition':'Monthly mean of reported top-five weights, using classic KSE100 sheet labels, exactly 100 reported rows, weight sum 98–102%, at least ten valid snapshots. Not effective membership or index levels.'}

def build(dataset,output,as_of):
    dataset=Path(dataset).resolve();catalog_path=dataset/'catalog.json';catalog=json.loads(catalog_path.read_text(encoding='utf-8'));inventory={item['id']:item for item in catalog['tables']};tables={};sources=[]
    for tid in TABLES:
        spec=inventory[tid];file=(dataset/spec['path']).resolve()
        if not file.is_relative_to(dataset):raise ValueError('Table path escapes dataset')
        digest=hashlib.sha256(file.read_bytes()).hexdigest()
        if digest!=spec['sha256']:raise ValueError('Upstream table hash changed: '+tid)
        tables[tid]=file;sources.append({'table':tid,'relative_path':spec['path'],'sha256':digest,'rows':spec['rows']})
    columns=['source_symbol','trading_date','close_distribution_adjusted','retrospective_price_eligible','gross_return_eligible','adjustment_segment','traded_volume_shares_raw']
    prices=pq.read_table(tables[TABLES[0]],columns=columns).to_pandas();breadth,price_coverage=supported_months(prices)
    macro=pq.read_table(tables[TABLES[2]]).to_pandas();macro_rows,macro_coverage,policy=macro_months(macro)
    concentration,concentration_coverage=concentration_months(pq.read_table(tables[TABLES[1]]).to_pandas())
    lookup={r['date']:r for r in macro_rows};weights={r['date']:r for r in concentration}
    for row in breadth:
        row.update({k:v for k,v in lookup.get(row['date'],{}).items() if k!='date'});row.update({k:v for k,v in weights.get(row['date'],{}).items() if k!='date'})
        event=next((item for item in reversed(policy) if item['date']<=str(pd.Period(row['date'],freq='M').end_time.date())),None)
        row['last_recorded_policy_rate']=event['value'] if event else None;row['policy_event_date']=event['date'] if event else None
    result={'schema_version':1,'generated_at':as_of.isoformat(),'market':'Pakistan','basis':'Reviewed observed-code cohort and source-labelled macro histories; not KSE100 index levels','upstream':{'name':'PakMarkets','author':'Muhammad Zulfiqar Ali','dataset_candidate':dataset.parent.name,'catalog_sha256':hashlib.sha256(catalog_path.read_bytes()).hexdigest(),'publicly_released':bool(catalog.get('publicly_released',False)),'source_tables':sources},'coverage':{'breadth_first':breadth[0]['date'],'breadth_last':breadth[-1]['date'],'equities':price_coverage,'macro':macro_coverage,'concentration':concentration_coverage},'methods':{'price_basis':'close_distribution_adjusted, retrospective_price_eligible and gross_return_eligible, positive reported turnover and positive prices','monthly_basis':'At least ten eligible quotes per observed code/month. Twelve consecutive monthly observations with one declared adjustment segment are required. Monthly means are means of supported quotes, not certified complete-session price averages.','stress':'Share of eligible codes at least the selected percentage below their maximum monthly mean within the trailing twelve-month window, including the current month.','trend':'Share of eligible codes below their trailing ten-month mean, including the current month.','change':'Median six-month change in adjusted quote means. Not portfolio returns or a total-return index.','scope':'Retrospective, selected reviewed sample. Codes and changing denominators are not the entire PSX universe, permanent issuer identities, effective KSE100 membership or real-time forecasts.','availability':'SBP values are current-history snapshots. Monthly aggregation and the last-recorded-event carry are derived views, not historical publication vintages.'},'rows':breadth,'macro_rows':sorted(macro_rows,key=lambda r:r['date']),'concentration_rows':concentration,'policy_events':policy,'limitations':['Continuous KSE100 level history is not contained in the imported PakMarkets tables. The advertised PSX chart endpoint returned 404 on 2026-10-05. No unofficial substitute is constructed.','No raw equity records, row-level macro data, action evidence or full PakMarkets bundle is included in this derivative. The upstream V1 remains unpublished.','Trailing incomplete July equity and August constituent-snapshot months are excluded. Currency and reserves have separate older cutoffs.']}
    Path(output).write_bytes((json.dumps(result,indent=2,allow_nan=False)+'\n').encode('utf-8'))
    print(json.dumps({'monthly_rows':len(breadth),'coverage':result['coverage']},indent=2));return result

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--dataset',required=True,type=Path);p.add_argument('--output',default=ROOT/'data/pakistan.json',type=Path);p.add_argument('--as-of',required=True,type=dt.date.fromisoformat);a=p.parse_args();build(a.dataset,a.output,a.as_of)
