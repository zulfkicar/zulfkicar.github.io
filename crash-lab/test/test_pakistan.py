import datetime as dt,sys,unittest
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from build_pakistan import closed_cutoff,supported_months,macro_months,concentration_months

def prices():
 rows=[]
 for i,month in enumerate(pd.period_range('2014-01','2015-01',freq='M')):
  for day in range(1,11):rows.append({'source_symbol':'ABC','trading_date':dt.date(month.year,month.month,day),'close_distribution_adjusted':100-i,'retrospective_price_eligible':True,'gross_return_eligible':True,'adjustment_segment':'A','traded_volume_shares_raw':1})
 rows.append({'source_symbol':'ABC','trading_date':dt.date(2015,2,15),'close_distribution_adjusted':1,'retrospective_price_eligible':False,'gross_return_eligible':False,'adjustment_segment':'A','traded_volume_shares_raw':0})
 return pd.DataFrame(rows)

class PakistanImporterChecks(unittest.TestCase):
 def test_incomplete_tail_is_excluded(self):
  self.assertEqual(closed_cutoff('2026-07-24'),'2026-06');self.assertEqual(closed_cutoff('2026-06-19',True),'2026-05');self.assertEqual(closed_cutoff('2026-05-29'),'2026-05')
 def test_known_cohort_counts_and_price_changes(self):
  rows,coverage=supported_months(prices());self.assertEqual([r['date'] for r in rows],['2014-12','2015-01']);self.assertEqual(rows[0]['eligible_codes'],1);self.assertEqual(rows[0]['below_trend_count'],1);self.assertEqual(rows[0]['peak_drop_counts']['10'],1);self.assertEqual(rows[0]['peak_drop_counts']['20'],0);self.assertAlmostEqual(rows[0]['median_change6_pct'],100*(89/95-1),places=3)
 def test_missing_month_cannot_be_stitched_into_a_rolling_window(self):
  d=prices();d=d[pd.to_datetime(d.trading_date).dt.month!=6]
  with self.assertRaisesRegex(ValueError,'No supported'):supported_months(d)
 def test_segment_change_cannot_be_stitched(self):
  d=prices();d.loc[pd.to_datetime(d.trading_date)>='2014-12-01','adjustment_segment']='B'
  with self.assertRaisesRegex(ValueError,'No supported'):supported_months(d)
 def test_gate_and_turnover_filters_change_support(self):
  d=prices();d.loc[pd.to_datetime(d.trading_date).dt.month==6,'gross_return_eligible']=False
  with self.assertRaisesRegex(ValueError,'No supported'):supported_months(d)
  d=prices();d.loc[pd.to_datetime(d.trading_date).dt.month==6,'traded_volume_shares_raw']=0
  with self.assertRaisesRegex(ValueError,'No supported'):supported_months(d)
 def test_duplicate_code_date_is_rejected(self):
  d=prices();d=pd.concat([d,d.iloc[:1]],ignore_index=True)
  with self.assertRaisesRegex(ValueError,'Duplicate'):supported_months(d)
 def test_macro_units_convert_millions_to_billions(self):
  rows=[]
  for day in list(range(1,12))+[30]:rows.append({'series_id':'PK_USD_PKR_BANK_FLOATING_DAILY_AVG','reference_period_start':dt.date(2026,1,day),'value':100,'unit_code':'PKR_PER_USD','scale_power10':0})
  for day in [2,9,16,23,30]:rows.append({'series_id':'PK_FX_RESERVES_SBP_USD_M','reference_period_start':dt.date(2026,1,day),'value':2000,'unit_code':'USD','scale_power10':6})
  rows.append({'series_id':'PK_SBP_POLICY_TARGET_RATE_PA_PCT','reference_period_start':dt.date(2025,12,16),'value':12,'unit_code':'PERCENT_PA','scale_power10':0})
  result,coverage,events=macro_months(pd.DataFrame(rows));jan=next(r for r in result if r['date']=='2026-01');self.assertEqual(jan['reserves'],2);self.assertEqual(jan['fx'],100);self.assertEqual(events[0]['value'],12);self.assertEqual(coverage['policy']['reference_last'],'2025-12-16')
 def test_price_return_sheet_is_not_mixed_into_classic_index_concentration(self):
  rows=[]
  for day in list(range(1,12))+[30]:
   for name,weight in [('KSE-100',25),('KSE100PR',90)]:rows.append({'snapshot_date':dt.date(2026,1,day),'index_sheet_name':name,'psx_index_constituent_count':100,'psx_index_weight_sum_pct':100,'psx_index_top5_weight_pct__status_code':'ELIGIBLE','psx_index_top5_weight_pct':weight})
  result,coverage=concentration_months(pd.DataFrame(rows));self.assertEqual(result[0]['top5_weight_pct'],25);self.assertEqual(result[0]['snapshot_count'],12)
if __name__=='__main__':unittest.main()
