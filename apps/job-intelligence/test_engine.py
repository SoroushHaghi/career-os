import importlib.util, tempfile, json, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('engine',str(Path(__file__).with_name('engine.py')))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
class EngineTests(unittest.TestCase):
 def setUp(self):self.cfg={'profile':{'locations':['Münster','Braunschweig'],'priority_companies':['Infineon'],'max_duration_months':3}}
 def job(self,title='Quantum Software Internship',description='Quantum algorithms Python Qiskit simulation',company='Acme',location='Braunschweig'):
  return e.norm({'title':title,'description':description,'company':company,'location':location,'url':'https://example.org/job/1','external_id':'1'},'test')
 def test_seniority_gate(self):self.assertEqual(e.classify(self.job(title='Senior UI Designer'),self.cfg['profile'])[1],'EXCLUDED_ROLE')
 def test_duration_gate(self):self.assertEqual(e.classify(self.job(description='Duration of contract: 4 months Quantum ML'),self.cfg['profile'])[1],'EXCLUDED_DURATION')
 def test_range_duration_gate(self):
  self.assertEqual(e.classify(self.job(description='Duration of contract: 4–6 months Quantum ML'),self.cfg['profile'])[1],'EXCLUDED_DURATION')
 def test_export_header(self):
  self.assertEqual(len(e.export_rows({'jobs':{}})[0]),10)
 def test_quantum(self):self.assertGreaterEqual(e.classify(self.job(),self.cfg['profile'])[0],60)
 def test_distinct_city_same_job(self):
  a=self.job();b=self.job(location='Münster');self.assertNotEqual(e.key_for(a),e.key_for(b))
 def test_all_saved_above_top_five(self):
  jobs={str(i):{**self.job(),'company':str(i),'score':90-i,'eligibility':'DURATION_UNVERIFIED'} for i in range(12)}
  rows=e.export_rows({'jobs':jobs});self.assertEqual(len(rows),13)
 def test_persist_on_source_page_before_eval(self):
  jobs=[self.job()]
  old=e.fetch_source
  def fake(_):yield jobs
  e.fetch_source=fake
  try:
   with tempfile.TemporaryDirectory() as d:
    p=Path(d)/'jobs.json';e.discover({'sources':[{'type':'mock'}]},p)
    self.assertEqual(len(e.load(p,{})['jobs']),1)
    self.assertEqual(next(iter(e.load(p,{})['jobs'].values()))['processing'],'PENDING_EVALUATION')
  finally:e.fetch_source=old
 def test_retry_on_failed_llm(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'jobs.json';j=self.job();e.atomic_json(p,{'jobs':{e.key_for(j):{**j,'processing':'RETRY_EVALUATION'}}})
   e.evaluate(self.cfg,p);self.assertEqual(next(iter(e.load(p,{})['jobs'].values()))['processing'],'EVALUATED')
if __name__=='__main__':unittest.main()
