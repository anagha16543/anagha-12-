import subprocess,os,tempfile
# Writes the PDFs into <repo>/documents. Needs Google Chrome (headless) to render.
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
os.makedirs(os.path.join(ROOT,'documents'),exist_ok=True)
os.chdir(os.path.join(ROOT,'documents'))
TMP=os.path.join(tempfile.gettempdir(),'_g.html')
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
CSS="""@page{size:A4;margin:14mm}body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;font-size:10.5pt;line-height:1.4;color:#1b1a2e}
h1{font-size:19pt;margin:0 0 2pt;color:#2b2470}.sub{color:#555;margin:0 0 8pt}
h2{font-size:12.5pt;margin:11pt 0 4pt;color:#fff;background:#5b3fe0;padding:3pt 8pt;border-radius:4pt}
ol,ul{margin:3pt 0 3pt 16pt;padding:0}li{margin:1.5pt 0}table{border-collapse:collapse;width:100%;margin:4pt 0;font-size:9.6pt}
th{background:#ece8ff;text-align:left}th,td{border:1px solid #c9c2ee;padding:3pt 5pt;vertical-align:top}
code{background:#f1eefc;padding:0 3px;border-radius:3px;font-size:9.2pt;font-family:Menlo,Consolas,monospace}
.box{border:2px solid #7C5CFF;border-radius:6pt;padding:5pt 8pt;background:#f7f5ff;margin:4pt 0}
.ok{color:#127a3d;font-weight:700}.warn{color:#9a6700;font-weight:700}.bad{color:#b42318;font-weight:700}
.goal{border:2px solid #127a3d;border-radius:6pt;padding:5pt 8pt;background:#f0fbf4;margin-top:6pt}small{color:#666}"""
def t(rows):
    s="<table>"
    for i,r in enumerate(rows):
        tag='th' if i==0 else 'td'; s+="<tr>"+"".join(f"<{tag}>{c}</{tag}>" for c in r)+"</tr>"
    return s+"</table>"
def start(n,folder):
    return f"""<div class="box"><b>Before you start</b><ol><li>Open <b>http://127.0.0.1:5500</b> in your browser (type <code>127.0.0.1</code>, not localhost).</li>
<li>Click <b>Sign in</b>. Email <code>hod@college.edu</code> &nbsp; Password <code>password123</code></li>
<li>In the menu on the left, click <b>Criterion {n}</b>.</li><li>The test files are in the folder <b>{folder}</b> that came with this guide.</li></ol>
<small>If a number looks old, press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac).</small></div>"""
HOW="""<p><b>How to type a value:</b> on the row click <b>Inputs</b>, type exactly what is shown in the box named, then click <b>Save and re-evaluate</b>. Copy and paste the text to avoid typing mistakes. Do the rows <b>one by one, in order</b>; do not skip a row.</p>"""
def upload(tab,note,ex):
    return f"""<h2>Step 3: Upload the documents</h2><ol><li>{tab}</li><li>Click <b>+ Upload evidence document</b>.</li>
<li>Type any title, choose a file, and in <b>This document proves requirement</b> choose the <b>same number</b> as the file name (file <code>{ex}_...</code> goes with requirement {ex}).</li>
<li>Click <b>Upload evidence</b>. The file appears with a green tag <span class="ok">Proves {ex}</span>.</li></ol>{note}"""
def build(fn,title,sub,body):
    open(TMP,'w').write(f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body><h1>{title}</h1><p class='sub'>{sub}</p>{body}</body></html>")
    subprocess.run([CHROME,'--headless=new','--disable-gpu','--no-pdf-header-footer',f'--print-to-pdf={fn}','file://'+TMP],capture_output=True)
P='<span class="ok">PASS</span>';W='<span class="warn">WARNING</span>';F='<span class="bad">FAIL</span>'
build('Test_Guide_Criterion_3.pdf','Test Guide: Criterion 3','Outcome-Based Assessment. About 15 minutes.',
start(3,'Test_Files/C3')+"<h2>Step 1: See where you start</h2><p>Click <b>Evaluate All C3</b>. You should see a total of <b>10 / 120</b>. Only 3.1 passes.</p><h2>Step 2: Type the scores</h2>"+HOW+t([
['Row','Type this','You should see'],['3.1','nothing (automatic)',P+' 10'],['3.2','Box <code>reviewer score</code>: <code>8</code>',P+' 8'],
['3.3','<code>reviewer score</code>: <code>5</code>',W+' 5'],['3.4','<code>reviewer score</code>: <code>2</code>',F+' 2'],
['3.5','<code>reviewer score</code>: <code>15</code>',P+' 15'],['3.6','<code>reviewer score</code>: <code>7</code>',P+' 7']])+
"<p><small>These scores are test values. In real use the HOD types an honest score from 0 to 10 (3.5 is out of 20).</small></p><h2>Step 3: Approve 3.7 and 3.8</h2><ol><li>Click the tab <b>CO Attainment &amp; Matrix</b>.</li><li>Click <b>Approve attainment method</b>.</li><li>Go back to the tab <b>Requirements &amp; Evaluation</b> and click <b>Evaluate All C3</b>.</li></ol>"+
t([['Row','You should see'],['3.7',W+' 16.67'],['3.8',P+' 18.26']])+
"<h2>Step 4: Upload the documents</h2><ol><li>Click the tab <b>Evidence Documents</b>, then <b>+ Upload Evidence Document</b>.</li><li>Type any title, choose a file, and choose the <b>same number</b> in <b>This document proves requirement</b> (file <code>3.2_...</code> goes with 3.2).</li><li>Click <b>Upload evidence</b>. Repeat for all 8 files (3.1 to 3.8). Each shows <span class='ok'>Proves 3.x</span>.</li></ol>"+
"<div class='goal'><b>You passed the test if:</b> Evaluate All C3 shows <b>81.9 / 120</b> and all 8 files show <b>Proves</b>.<br><small>If you see 71.9, one score is on the wrong row. Check 3.3 = 5, 3.4 = 2, 3.5 = 15, 3.6 = 7.</small></div>")
build('Test_Guide_Criterion_4.pdf','Test Guide: Criterion 4',"Students' Performance. About 15 minutes.",
start(4,'Test_Files/C4')+"<h2>Step 1: See where you start</h2><p>Click <b>Evaluate Criterion 4</b>. You should see a total of about <b>18 / 120</b>. Rows 4.3, 4.4 and 4.5 are automatic and show about 6 each. The others are waiting for your numbers.</p><h2>Step 2: Type the numbers</h2>"+HOW+t([
['Row','Box name and what to type','You should see'],
['4.1','<code>years</code>: <code>[{"N1":50,"N4":0,"N":66}]</code>',P+' 14 / 20'],
['4.2','<code>batches</code>: <code>[{"A":50,"B":45,"N":60,"N2":0}]</code>',P+' 11.25 / 15'],
['4.3, 4.4, 4.5','nothing (automatic from student marks)',W+' about 6 / 10 each'],
['4.6','<code>overlap policy configured</code>: <code>true</code><br><code>years</code>: <code>[{"X":40,"Y":8,"Z":2,"FS":55,"N":60,"N2":0}]</code>',P+' 25 / 30'],
['4.7','<code>reviewer score</code>: <code>18</code>',P+' 18 / 25']])+
upload("Click the tab <b>Evidence Checklist &amp; Result Sheets</b>.","<p>Upload all 7 files (4.1 to 4.7).</p>","4.1")+
"<h2>Step 4: Look around</h2><ul><li>Tab <b>Success Rate &amp; Academic Index</b>: the figures behind 4.2 to 4.5, and a list of <b>students who may need support</b> (low attendance or marks).</li><li>Tab <b>Placements &amp; Higher Studies</b>: the figures behind 4.6 and 4.7.</li></ul>"+
"<div class='goal'><b>You passed the test if:</b> Evaluate Criterion 4 shows about <b>86.1 / 120</b> and all 7 files show <b>Proves</b>.</div>")
build('Test_Guide_Criterion_5.pdf','Test Guide: Criterion 5','Faculty Information. About 10 minutes.',
start(5,'Test_Files/C5')+"<h2>Step 1: See where you start</h2><p>Click <b>Evaluate Criterion 5</b>. You should see a total of <b>80 / 100</b>. Rows 5.1, 5.2 and 5.3 already pass because they are worked out automatically from the faculty records. 5.4 shows a warning and 5.5 fails because they need your numbers.</p><h2>Step 2: Type the numbers</h2>"+HOW+t([
['Row','Box name and what to type','You should see'],['5.1, 5.2, 5.3','nothing (automatic from faculty records)',P+' 30, 25 and 25'],
['5.4','<code>provision exists</code>: <code>true</code><br><code>yearly hours</code>: <code>[60,55,50]</code>',P+' 10 / 10'],
['5.5','<code>A</code>: <code>0</code> &nbsp; <code>B</code>: <code>0</code> &nbsp; <code>C</code>: <code>1</code> &nbsp; <code>D</code>: <code>2</code> &nbsp; <code>E</code>: <code>3</code><br><code>boundary resolved</code>: <code>true</code><br>(leave the grey "Auto" boxes as they are)',P+' 10 / 10']])+
upload("Scroll down below the requirements table to the box called <b>Evidence documents</b>.","<p>Upload all 5 files (5.1 to 5.5).</p>","5.1")+
"<h2>Step 4: Look around</h2><ul><li>Tab <b>Faculty Roster &amp; Profile Rings</b>: everyone counted, with their qualifications.</li><li>Tab <b>SFR, FQI &amp; Cadre Gauges</b>: the numbers behind each score (60 students, 7 faculty).</li><li>Tab <b>Workload &amp; Assignments</b>: who teaches which subject.</li></ul><div class='goal'><b>You passed the test if:</b> Evaluate Criterion 5 shows <b>100 / 100</b> and all 5 files show <b>Proves</b>.</div>")
rows6=[['6.1.1','<code>reviewer score</code>: <code>4</code>',P+' 4 / 5'],['6.1.2.1','<code>yearly count</code>: <code>[3,4,5]</code>',P+' 5 / 5'],
['6.1.2.2','<code>yearly attendances</code>: <code>[5,4,6]</code>',W+' 3.33 / 5'],['6.1.3','<code>reviewer score</code>: <code>5</code>',P+' 5 / 7'],
['6.1.4','<code>certified students</code>: <code>20</code> &nbsp; <code>total students</code>: <code>60</code><br><code>reviewer score</code>: <code>6</code> &nbsp; <code>boundary resolved</code>: <code>true</code>',P+' 6 / 8'],
['6.1.5','<code>programs</code>: <code>[{"duration_days":5,"year":2026}]</code>',F+' 2 / 10'],
['6.1.6','<code>participating students</code>: <code>30</code> &nbsp; <code>total students</code>: <code>60</code><br><code>reviewer score</code>: <code>6</code> &nbsp; <code>boundary resolved</code>: <code>true</code>',W+' 6 / 10'],
['6.1.7','<code>trained students</code>: <code>30</code> &nbsp; <code>total students</code>: <code>60</code><br><code>reviewer score</code>: <code>6</code> &nbsp; <code>boundary resolved</code>: <code>true</code>',W+' 6 / 10'],
['6.2.1','<code>quality score</code>: <code>4</code> (publication count is automatic)',P+' 8 / 10'],
['6.2.2','<code>enrolled count</code>: <code>2</code> &nbsp; <code>graduated count</code>: <code>1</code>',W+' 3 / 5'],
['6.2.3, 6.2.4, 6.2.5','nothing (automatic from faculty records)',f'6.2.3 {F} 2 &nbsp; 6.2.4 {P} 15 &nbsp; 6.2.5 {F} 3'],
['6.2.6','<code>received lakhs</code>: <code>5</code> &nbsp; <code>utilized lakhs</code>: <code>3</code> &nbsp; <code>boundary resolved</code>: <code>true</code>',W+' 3 / 5']]
build('Test_Guide_Criterion_6.pdf','Test Guide: Criterion 6','Faculty Contributions. About 20 minutes.',
start(6,'Test_Files/C6')+"<h2>Step 1: See where you start</h2><p>Click <b>Evaluate Criterion 6</b>. You should see a total of about <b>24 / 120</b>. Only the rows worked out from faculty records have marks.</p><h2>Step 2: Type the numbers</h2>"+HOW+t([['Row','Box name and what to type','You should see']]+rows6)+
upload("Scroll down below the requirements table to the box called <b>Evidence documents</b>.","<p>Upload all 14 files (6.1.1 to 6.2.6).</p>","6.1.1")+
"<div class='goal'><b>You passed the test if:</b> Evaluate Criterion 6 shows about <b>71.3 / 120</b> and all 14 files show <b>Proves</b>.</div><h2>Last check (after testing Criteria 3, 4, 5 and 6)</h2><p>Scroll down the left menu to <b>Virtual Inspection</b> (or open <b>http://127.0.0.1:5500/dashboards/inspection.html</b>) and click <b>Run Virtual NBA Inspection</b>. You should see about <b>339 / 460 marks (73.8%)</b>, status <b>NEARLY READY</b>, and <b>0 requirements without evidence</b>.</p>")

build('Dashboard_Criteria_Map.pdf','Which dashboard handles which criterion','One-page map for Admin, HOD and Faculty.',
"<h2>Who uses what</h2>"+t([['Dashboard','Who','What it does for NBA'],
['<b>Faculty</b><br><small>/dashboards/faculty.html</small>','Faculty','Adds the raw data: own course outcomes and marks (C3), qualifications, publications, patents, projects, training (C5, C6) and uploads evidence files.'],
['<b>HOD</b><br><small>/dashboards/hod.html</small>','HOD','Approves faculty and submissions, assigns subjects, types reviewer scores, runs Evaluate, sees gaps and assigns corrective actions.'],
['<b>Admin</b><br><small>/dashboards/admin.html</small>','Admin','Approves users, backups, audit log, whole-institution view. Can do everything the HOD can.'],
['<b>Criterion 3 to 6 pages</b><br><small>/dashboards/c3.html to c6.html</small>','HOD, Admin (Faculty can view and upload)','Where each criterion is checked: requirement list, marks, Evaluate, Inputs, evidence.'],
['<b>Virtual Inspection</b><br><small>/dashboards/inspection.html</small>','HOD, Admin','Checks all four criteria together and gives one readiness score.']])+
"<h2>Which dashboard is responsible for which criterion</h2>"+t([['Criterion','Marks','Faculty adds','HOD / Admin does','Check it on'],
['<b>3</b> Outcome-based assessment','120','Course outcomes and student marks for own subjects; evidence files','Reviewer scores for 3.2 to 3.6; approves the attainment method (3.7, 3.8); Evaluate','c3.html'],
['<b>4</b> Students performance','120','Evidence files (result sheets, placement records)','Enrolment, success-rate and placement numbers (4.1, 4.2, 4.6); reviewer score 4.7; Evaluate','c4.html'],
['<b>5</b> Faculty information','100','Own profile, qualifications, experience; evidence files','Visiting-faculty hours (5.4) and retention counts (5.5); Evaluate','c5.html'],
['<b>6</b> Faculty contributions','120','Publications, patents, projects, consultancy, training, memberships; evidence files','Reviewer scores and counts for 6.1.x and 6.2.x; Evaluate','c6.html'],
['<b>All four</b>','460','n/a','Run Virtual NBA Inspection for the combined score','inspection.html']])+
"<h2>What each role can and cannot do</h2>"+t([['Action','Faculty','HOD','Admin'],
['Add course outcomes and marks','Own subjects only','Yes','Yes'],['Upload evidence and link it to a requirement','Own uploads','Yes','Yes'],
['Type reviewer scores (Inputs)','No','Yes','Yes'],['Evaluate a criterion','No','Yes','Yes'],['Run Virtual Inspection','No','Yes','Yes'],
['Approve users, backups, audit log','No','No','Yes']])+
"<div class='goal'><b>Simple rule:</b> Faculty enter the facts. The HOD judges and evaluates. The Admin runs the system. The criterion pages show the result.</div>")
