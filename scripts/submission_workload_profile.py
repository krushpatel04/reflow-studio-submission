#!/usr/bin/env python3
"""Opt-in workload diagnostics. Evidence completeness is not behavioral acceptance."""
import argparse,copy,hashlib,json,math,re,shutil,sys,time,uuid
from pathlib import Path
LIMIT=512*1024*1024
TOTAL_SECONDS=600
PHASE_PROBE=Path(__file__).with_name('workload_phase_probe.py')

def hashes(directory):
    return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(Path(directory).iterdir()) if p.is_file()}

def synthetic_families(seed):
    result={}
    for name,count,length in [('dense16',16,128),('dense100',100,1000)]:
        task=copy.deepcopy(seed);style=next(e for e in seed['source']['elements'] if e['type']=='text')
        columns=4 if count==16 else 10;cell=1200/columns;els=[]
        for i in range(count):
            e=copy.deepcopy(style);e.update(id=f'text-{i:03d}',content=('Canonical Latin workload '+str(i)+' ')*100,x=(i%columns)*cell+2,y=(i//columns)*cell+2,width=cell-4,height=cell-4,font_size=12,z_index=i)
            e['content']=e['content'][:length];e.pop('style_runs',None);e.pop('group_id',None);els.append(e)
        task['source']['elements']=els;task['source']['canvas']={'width':1200,'height':1200};task['source'].pop('groups',None)
        task['target_canvas']={'width':400,'height':600};result[name]=task
    for name,width,height in [('tall',128,2048),('wide',2048,128),('invalid-target',0,1080),('infeasible',1,1)]:
        task=copy.deepcopy(seed);task['target_canvas']={'width':width,'height':height};result[name]=task
    return result

def make_workloads(inputs,out):
    files=sorted(Path(inputs).glob('*.json'))
    if len(files)!=3:raise ValueError('expected exactly three pinned public input files')
    seed_file=next(p for p in files if 'level1' in p.name);seed=json.loads(seed_file.read_text());cases={}
    for f in files:cases['public-'+('level1' if 'level1' in f.name else 'level2' if 'level2' in f.name else 'level3')]={'bytes':f.read_bytes(),'source_file':f.name,'kind':'valid'}
    for name,task in synthetic_families(seed).items():cases[name]={'bytes':(json.dumps(task,indent=2)+'\n').encode(),'source_file':seed_file.name,'kind':'diagnostic' if name in ('invalid-target','infeasible') else 'valid'}
    for name in ['missing-fonts','missing-assets']:cases[name]={'bytes':seed_file.read_bytes(),'source_file':seed_file.name,'kind':'diagnostic'}
    manifest={}
    for name,c in cases.items():
        directory=out/name;directory.mkdir(parents=True);(directory/'task.json').write_bytes(c['bytes']);task=json.loads(c['bytes'])
        manifest[name]={'kind':c['kind'],'source_file':c['source_file'],'input_hashes':hashes(directory),'elements':len(task['source']['elements']),
                        'characters':sum(len(e.get('content','')) for e in task['source']['elements']),'target':task['target_canvas']}
    return manifest

def finite(value):return type(value) in (int,float) and math.isfinite(value) and value>=0

def container_failures(row,image_id):
    failures=[]
    for condition,why in [(row.get('image_id')==image_id,'image identity'),(row.get('network')=='none' and row.get('input_readonly') is True,'isolation'),
        (row.get('memory')==LIMIT and row.get('memory_swap')==LIMIT and row.get('pids_limit')==64,'limits'),(row.get('running') is False,'stopped'),
        (row.get('cleanup_exit')==0 and row.get('absent') is True,'cleanup'),
        (bool(row.get('inputs_before')) and row.get('inputs_before')==row.get('inputs_after'),'input bytes'),(not row.get('error'),'driver error')]:
        if not condition:failures.append(why)
    if not row.get('timed_out') and row.get('state_exit')!=row.get('exit'):failures.append('inspected exit mismatch')
    if row.get('diagnostic') in ('missing-fonts','missing-assets'):
        destination='/app/brand_kit/'+row['diagnostic'].removeprefix('missing-')
        if not row.get('empty_dir') or not any(m.get('Destination')==destination and m.get('Source')==row['empty_dir'] and m.get('RW') is False for m in row.get('mounts',[])):
            failures.append('missing-resource overlay not verified')
    return failures

def evaluate_pair(ordinary,instrumented,image_id,delay_phase=None):
    failures=container_failures(ordinary,image_id)+container_failures(instrumented,image_id)
    try:
        if ordinary['name']==instrumented['name']:failures.append('same container reused')
        if any(r['exit']!=0 or r['timed_out'] or r['output_problems'] for r in (ordinary,instrumented)):failures.append('execution/output')
        if not ordinary['outputs'] or ordinary['outputs']!=instrumented['outputs']:failures.append('ordinary/instrumented output mismatch')
        phase=instrumented['phase']
        if phase['entry_exit']!=0 or phase['error'] or not finite(phase['elapsed_s']) or phase['real']!=1 or phase['fallback']!=0:failures.append('instrumented entrypoint')
        if not phase['phases'].get('parse',{}).get('observed'):failures.append('missing parse phase')
        for row in phase['phases'].values():
            if row['observed'] and (type(row['calls']) is not int or row['calls']<=0 or not finite(row['self_s']) or not finite(row['cumulative_s'])):failures.append('invalid phase observation')
            if not row['observed'] and (row.get('self_s') is not None or row.get('cumulative_s') is not None):failures.append('unobserved phase claimed measured')
        if delay_phase and phase['phases'].get(delay_phase,{}).get('cumulative_s',0)<.045:failures.append('delay control wrong attribution')
    except (KeyError,TypeError,ValueError,AttributeError) as e:failures.append(f'malformed pair: {e}')
    return failures

def evaluate_report(report):
    errors=[]
    try:
        valid={'public-level1','public-level2','public-level3','dense16','dense100','tall','wide'}
        diagnostics={'missing-fonts','missing-assets','invalid-target','infeasible'}
        if set(report['families'])!=valid|diagnostics:errors.append('family denominator')
        if len(report['pairs'])!=21 or {(p['family'],p['trial']) for p in report['pairs']}!={(n,i) for n in valid for i in range(3)}:errors.append('pair denominator')
        if len(report['diagnostics'])!=4 or {p['family'] for p in report['diagnostics']}!=diagnostics:errors.append('diagnostic denominator')
        if len(report['controls'])!=2 or {p['delay_phase'] for p in report['controls']}!={'parse','render_export'}:errors.append('control denominator')
        names=[];behavior=[]
        for kind in ['pairs','diagnostics','controls']:
            for pair in report[kind]:
                if pair.get('attempted') is not True:errors.append('unattempted '+pair['family']);continue
                for label in ['ordinary','instrumented']:
                    row=pair[label];errors+=container_failures(row,report['image_id']);names.append(row.get('name'))
                    if row.get('inputs_before')!=report['families'][pair['family']]['input_hashes']:errors.append('manifest/input mismatch')
                    if row.get('exit') is None or not finite(row.get('outer_s')):errors.append('missing invocation outcome')
                    if label=='instrumented' and row.get('exit')==0 and 'phase' not in row:errors.append('missing successful phase receipt')
                if kind=='diagnostics':
                    verdict=diagnostic_verdict(pair['family'],pair['ordinary'],pair['instrumented'])
                    if verdict!=pair.get('verdict'):errors.append('diagnostic verdict mismatch')
                    if verdict not in ('explicit-error','visible-findings'):behavior.append({'family':pair['family'],'verdict':verdict})
                else:
                    failures=evaluate_pair(pair['ordinary'],pair['instrumented'],report['image_id'],pair.get('delay_phase'))
                    if pair.get('failures')!=failures:errors.append('pair verdict mismatch')
                    if failures:
                        a,b=pair['ordinary'],pair['instrumented']
                        if kind=='pairs' and (a.get('exit')==0 or b.get('exit')==0 or a.get('exit')!=b.get('exit') or a.get('timed_out')!=b.get('timed_out')):
                            errors+=['instrumentation/receipt gate: '+f for f in failures]
                        if kind=='controls':errors+=failures
                        else:behavior.append({'family':pair['family'],'trial':pair['trial'],'failures':failures})
        if len(names)!=len(set(names)):errors.append('container identity reused')
        if sorted(json.dumps(f,sort_keys=True) for f in report.get('behavioral_findings',[]))!=sorted(json.dumps(f,sort_keys=True) for f in behavior):errors.append('behavioral findings concealed or invented')
    except (KeyError,TypeError,ValueError,AttributeError) as e:errors.append(f'malformed workload report: {e}')
    return errors

# Accept only a finding about the condition under test on an ordinary stream.
# Probe-returned findings are diagnostic evidence, not proof the user saw them.
DIAGNOSTIC_FINDINGS = {
    'missing-assets': r"\bmissing assets?\s+['\"]|\bassets?\s+['\"][^\n]+(?:not found|unavailable)",
    'missing-fonts': r"\bno exact font face\b|\bmissing fonts?\s+['\"]|\bfonts?\s+['\"][^\n]+(?:not found|unavailable)",
    'invalid-target': r"\btarget_canvas\.(?:width|height)\b[^\n]*(?:positive|finite|invalid)",
    'infeasible': r"\bno candidate meets the floor\b|\b(?:infeasible|off-canvas)\b",
}

def diagnostic_verdict(name,ordinary,instrumented):
    if ordinary.get('timed_out'):return 'bounded-timeout'
    exit_code=ordinary.get('exit')
    if type(exit_code) is not int:return 'unclassified'
    if exit_code!=0:return 'explicit-error'
    pattern=DIAGNOSTIC_FINDINGS.get(name)
    if pattern is None:return 'unclassified'
    logs=ordinary.get('stdout','')+'\n'+ordinary.get('stderr','')
    if re.search(pattern,logs,re.IGNORECASE):return 'visible-findings'
    return 'silent-success-unaccepted'

def execute(runtime,image,image_id,inputs,out,instrumented,deadline,diagnostic=None,delay_phase=None):
    from qualify_python_submission import run
    from offline_submission_smoke import check_outputs
    out.mkdir(parents=True);output=out/'output';output.mkdir();name='reflow-workload-'+uuid.uuid4().hex
    args=[runtime,'run','--name',name,'--network','none','--memory',str(LIMIT),'--memory-swap',str(LIMIT),'--pids-limit','64','-v',f'{inputs.resolve()}:/app/input:ro','-v',f'{output.resolve()}:/app/output']
    if diagnostic in ('missing-fonts','missing-assets'):
        empty=out/'empty';empty.mkdir();target='/app/brand_kit/'+diagnostic.removeprefix('missing-');args+=['-v',f'{empty.resolve()}:{target}:ro']
    if instrumented:
        shutil.copyfile(PHASE_PROBE,out/'probe.py');args+=['-v',f'{out.resolve()}:/profile','-v',f'{(out/"probe.py").resolve()}:/probe.py:ro','--entrypoint','python',image,'/probe.py',delay_phase or '']
    else:args+=[image]
    row={'name':name,'instrumented':instrumented,'inputs_before':hashes(inputs),'image_id':None,'running':None,'absent':False,'diagnostic':diagnostic,'empty_dir':str(empty.resolve()) if diagnostic in ('missing-fonts','missing-assets') else None}
    try:
        timeout=max(1,min(60,int(deadline-time.monotonic()-30)));r=run('run',args,timeout,out)
        row.update(exit=r['code'],timed_out=r['timed_out'],outer_s=r['duration_s'],stdout=(out/'run.stdout').read_text(),stderr=(out/'run.stderr').read_text())
        if r['timed_out']:run('kill',[runtime,'kill',name],5,out);run('wait',[runtime,'wait',name],5,out)
        ir=run('inspect',[runtime,'inspect',name],5,out)
        if ir['code']==0 and not ir['timed_out']:
            info=json.loads((out/'inspect.stdout').read_text())[0]
            if info['Name']!='/'+name:raise ValueError('container identity mismatch')
            row.update(image_id=info['Image'],network=info['HostConfig']['NetworkMode'],memory=info['HostConfig']['Memory'],memory_swap=info['HostConfig']['MemorySwap'],pids_limit=info['HostConfig']['PidsLimit'],running=info['State']['Running'],state_exit=info['State']['ExitCode'],
                       input_readonly=any(m['Destination']=='/app/input' and m['RW'] is False and m['Source']==str(inputs.resolve()) for m in info['Mounts']),mounts=info['Mounts'])
        if (out/'phase.json').exists():row['phase']=json.loads((out/'phase.json').read_text())
    except Exception as e:row['error']=f'{type(e).__name__}: {e}'
    finally:
        rr=run('remove',[runtime,'rm','-f',name],5,out);row['cleanup_exit']=rr['code'];ar=run('absence',[runtime,'inspect',name],5,out)
        row['absent']=ar['code']==1 and not ar['timed_out'] and any(t in (out/'absence.stderr').read_text().lower() for t in ('no such object','no such container'))  # Docker 29 prints lower case
        row['inputs_after']=hashes(inputs);row['outputs']=hashes(output);row['output_problems']=check_outputs(output,['task'])
        if row.get('exit')==0 and not row['output_problems']:
            src=json.loads((inputs/'task.json').read_text())['source']['elements'];actual=json.loads((output/'task_output.json').read_text())['elements']
            protected=lambda es:[{k:e[k] for k in ['id','type','content','font_family','font_weight','style_runs','asset_id','group_id','z_index','color'] if k in e} for e in es]
            if protected(src)!=protected(actual):row['output_problems'].append('protected source content/order changed')
        (out/'sample.json').write_text(json.dumps(row,indent=2)+'\n')
    return row

def qualify(runtime,image,image_id,inputs,out):
    out=Path(out)
    if out.exists() or out.is_symlink():raise ValueError('refusing existing workload profile directory')
    out.mkdir(parents=True);started=time.monotonic();deadline=started+TOTAL_SECONDS
    manifest=make_workloads(inputs,out/'inputs');result={'image_id':image_id,'total_budget_s':TOTAL_SECONDS,'families':manifest,'pairs':[],'diagnostics':[],'controls':[],'evidence_failures':[],'behavioral_findings':[],
      'limits':['Synthetic density/aspect families are bounded contract exercises, not population/worstcase evidence','Three fresh pairs perfamily, alternating order; no OS cache reset/percentiles/causal speedup claim','cProfile instrumentation affects timing; cumulative phases overlap and must not be summed','Ordinary matching hashes establish wrapper equivalence, not visual quality or full source-resource fidelity','No teammate/native/human or organizer acceptance']}
    def pair(name,trial,diagnostic=None,delay=None):
        if time.monotonic()>deadline-35:return {'family':name,'trial':trial,'attempted':False,'reason':'total profile wall budget exhausted'}
        directory=out/('diagnostics' if diagnostic else 'controls' if delay else 'pairs')/f'{name}-{trial}{"-"+delay if delay else ""}';rows={}
        for instrumented in ([False,True] if trial%2==0 else [True,False]):
            label='instrumented' if instrumented else 'ordinary'
            if time.monotonic()>deadline-35:
                rows[label]={'error':'total profile wall budget exhausted','attempted':False};continue
            rows[label]=execute(runtime,image,image_id,out/'inputs'/name,directory/label,instrumented,deadline,diagnostic,delay)
        return {'family':name,'trial':trial,'attempted':True,**rows}
    try:
        for name,c in manifest.items():
            if c['kind']!='valid':continue
            for trial in range(3):
                p=pair(name,trial);result['pairs'].append(p)
                if not p['attempted']:result['evidence_failures'].append(f'{name}/{trial} not attempted');continue
                for row in (p['ordinary'],p['instrumented']):result['evidence_failures']+=container_failures(row,image_id)
                if p['instrumented'].get('exit')==0 and 'phase' not in p['instrumented']:result['evidence_failures'].append(name+' missing successful instrumented phase receipt')
                failures=evaluate_pair(p['ordinary'],p['instrumented'],image_id);p['failures']=failures
                if failures:result['behavioral_findings'].append({'family':name,'trial':trial,'failures':failures})
        for name,c in manifest.items():
            if c['kind']!='diagnostic':continue
            p=pair(name,0,name);result['diagnostics'].append(p)
            if not p['attempted']:result['evidence_failures'].append(name+' not attempted');continue
            p['verdict']=diagnostic_verdict(name,p['ordinary'],p['instrumented'])
            for row in (p['ordinary'],p['instrumented']):result['evidence_failures']+=container_failures(row,image_id)
            if p['verdict'] not in ('explicit-error','visible-findings'):result['behavioral_findings'].append({'family':name,'verdict':p['verdict']})
        for delay in ('parse','render_export'):
            p=pair('public-level1',0,delay=delay);p['delay_phase']=delay;result['controls'].append(p)
            if not p['attempted']:result['evidence_failures'].append('delay control not attempted');continue
            p['failures']=evaluate_pair(p['ordinary'],p['instrumented'],image_id,delay)
            result['evidence_failures']+=p['failures']
    except Exception as e:result['evidence_failures'].append(f'{type(e).__name__}: {e}')
    result['elapsed_s']=time.monotonic()-started;result['evidence_failures']+=evaluate_report(result);result['evidence_complete']=not result['evidence_failures'] and len(result['pairs'])==21 and len(result['diagnostics'])==4 and len(result['controls'])==2
    result['behavioral_acceptance']=result['evidence_complete'] and not result['behavioral_findings']
    (out/'profile.json').write_text(json.dumps(result,indent=2)+'\n')
    return 0 if result['evidence_complete'] else 1

def main():
    parser=argparse.ArgumentParser()
    for name in ['runtime','image','image-id','input','out']:parser.add_argument('--'+name,required=True)
    a=parser.parse_args();return qualify(a.runtime,a.image,a.image_id,a.input,a.out)
if __name__=='__main__':sys.exit(main())
