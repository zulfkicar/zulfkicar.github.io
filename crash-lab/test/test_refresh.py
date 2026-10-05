import csv,datetime as dt,importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'scripts'))
from build_data import last_complete_month,expected_sessions,recent_prices,read_workbook,build
from refresh_data import publisher_download,quote_csv

class RefreshChecks(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  (ROOT/'.data').mkdir(exist_ok=True)
 def test_month_boundary(self):
  self.assertEqual(last_complete_month(dt.date(2026,10,1)),'2026-09');self.assertEqual(last_complete_month(dt.date(2027,1,1)),'2026-12')
 def test_september_calendar(self):
  days=expected_sessions('2026-09');self.assertEqual(len(days),21);self.assertNotIn('2026-09-07',days);self.assertIn('2026-09-30',days)
 def test_actual_supplement(self):
  result=recent_prices(ROOT/'test/fixtures/september-2026.csv',dt.date(2026,10,5));self.assertEqual(result['2026-09']['count'],21);self.assertAlmostEqual(result['2026-09']['value'],7669.414286,places=6)
 def test_missing_day_rejected(self):
  with tempfile.TemporaryDirectory(dir=ROOT/'.data') as tmp:
   p=Path(tmp)/'prices.csv';lines=(ROOT/'test/fixtures/september-2026.csv').read_text().splitlines();p.write_text('\n'.join(lines[:-1])+'\n');
   with self.assertRaisesRegex(ValueError,'Incomplete'):recent_prices(p,dt.date(2026,10,5))
 def test_duplicate_day_rejected(self):
  with tempfile.TemporaryDirectory(dir=ROOT/'.data') as tmp:
   p=Path(tmp)/'prices.csv';data=(ROOT/'test/fixtures/september-2026.csv').read_text();p.write_text(data+data.splitlines()[1]+'\n');
   with self.assertRaisesRegex(ValueError,'Duplicate'):recent_prices(p,dt.date(2026,10,5))
 def test_freshness_cannot_silently_pass_stale_snapshot(self):
  with tempfile.TemporaryDirectory(dir=ROOT/'.data') as tmp:
   with self.assertRaisesRegex(ValueError,'expected completed month'):
    build(dt.date.fromisoformat(json.loads((ROOT/'data/snapshot.json').read_text())['coverage']['price']['last']+'-01')+dt.timedelta(days=65),output=Path(tmp)/'snapshot.json',require_fresh=True)
 def test_provisional_exclusion_happens_before_asof_filter(self):
  class Sheet:
   nrows=12
   def row_values(self,index):
    if index==7:
     r=['']*13;r[0]='Date';r[1]='P';r[6]='Rate GS10';r[12]='CAPE';return r
    if index==11:return ['','Oct price is Oct 1st close']
    r=[0]*13;r[0]={8:2026.08,9:2026.09,10:2026.10}[index];r[1]=100;r[6]=4;r[12]=30;return r
  class Book:
   def sheet_by_name(self,name):return Sheet()
  with patch('build_data.xlrd.open_workbook',return_value=Book()):
   rows,provisional,_=read_workbook(Path('unused'),dt.date(2026,10,5));self.assertEqual(rows[-1]['date'],'2026-09');self.assertEqual(provisional,'2026-10')
 def test_publisher_link_is_discovered_and_validated(self):
  html='<a href="//img1.wsimg.com/download/ie_data.xls?ver=1&amp;a=2">Download</a>'
  self.assertEqual(publisher_download(html),'https://img1.wsimg.com/download/ie_data.xls?ver=1&a=2')
  with self.assertRaises(ValueError):publisher_download('<a href="https://evil.example/ie_data.xls">x</a>')
 def test_wrong_quote_symbol_rejected(self):
  with tempfile.TemporaryDirectory(dir=ROOT/'.data') as tmp:
   with self.assertRaises(ValueError):quote_csv({'chart':{'result':[{'meta':{'symbol':'SPY'}}]}},Path(tmp)/'quote.csv')
if __name__=='__main__':unittest.main()
