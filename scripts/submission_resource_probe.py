#!/usr/bin/env python3
"""Small descriptive Docker resource pilot; no percentile or cold-cache claims."""
import argparse, hashlib, json, math, shutil, sys, uuid
from pathlib import Path

LIMIT=512*1024*1024
WRAPPER=r'''
import time
started=time.perf_counter()
import json,sys,resource,hashlib,shutil,os
from pathlib import Path

def peak(path='/sys/fs/cgroup/memory.peak'):
    try:return int(Path(path).read_text())
    except (OSError,ValueError):return None

def rss():return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024
if sys.argv[1]=='calibration':
    before=rss();cb=peak();t=time.perf_counter();time.sleep(0.1);delay=time.perf_counter()-t
    allocation=bytearray(32*1024*1024)
    for i in range(0,len(allocation),4096):allocation[i]=1
    print('RESOURCE '+json.dumps(dict(delay_s=delay,requested_delay_s=0.1,allocation_bytes=len(allocation),rss_before=before,rss_after=rss(),cgroup_before=cb,cgroup_after=peak())))
    raise SystemExit(0)
sys.path.insert(0,'/app')
import engine.main as em
import renderer.converter.convert as conv
counts={'real':0,'fallback':0};original=conv.render_design_to_png;fallback=em._fallback_render

def render(*a,**kw):counts['real']+=1;return original(*a,**kw)
def fb(*a,**kw):counts['fallback']+=1;return fallback(*a,**kw)
conv.render_design_to_png=render;em._fallback_render=fb
import_s=time.perf_counter()-started
rows=[]
for i in range(int(sys.argv[1])):
    for previous in Path('/app/output').iterdir():
        if previous.is_file():previous.unlink()
    counts.update(real=0,fallback=0)
    t=time.perf_counter();rc=em.main();elapsed=time.perf_counter()-t
    rp=rss();cp=peak()
    output=Path('/app/output');snapshot=Path('/profile')/('iteration-'+str(i));snapshot.mkdir()
    for f in output.iterdir():
        if f.is_file():shutil.copyfile(f,snapshot/f.name)
    hashes={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in snapshot.iterdir()}
    rows.append(dict(iteration=i,rc=rc,elapsed_s=elapsed,rss_peak_bytes=rp,rss_scope='process cumulative high-water',cgroup_available=cp is not None,cgroup_limit_bytes=peak('/sys/fs/cgroup/memory.max'),cgroup_peak_bytes=cp,cgroup_path='/sys/fs/cgroup/memory.peak',outputs=hashes,**counts))
print('RESOURCE '+json.dumps(dict(import_s=import_s,pid=os.getpid(),iterations=rows)))
'''

def hashes(path):
    return {f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(Path(path).iterdir()) if f.is_file()}

def number(v):return type(v) in (int,float) and math.isfinite(v) and v>=0

def evaluate(p):
    """Validate raw observations, independent of any producer pass flag."""
    failures=[]
    def require(ok,why):
        if not ok:failures.append(why)
    def container(s):
        require(not s.get('error'),'container evidence error')
        require(s['image_id']==p['image_id'],'image identity')
        require(s['network']=='none' and s['input_readonly'] is True,'isolation')
        require(s['memory']==LIMIT and s['memory_swap']==LIMIT,'memory limit')
        require(s['exit']==0 and s['timed_out'] is False and s['running'] is False,'execution')
        require(s['cleanup_exit']==0 and s['absent'] is True,'cleanup')
        require(number(s['outer_s']),'outer duration')
    try:
        require(isinstance(p['inputs_before'],dict) and bool(p['inputs_before']) and p['inputs_before']==p['inputs_after'],'input bytes')
        expected=p['expected_outputs'];require(isinstance(expected,dict) and bool(expected),'expected outputs')
        count=len(p['inputs_before'])
        require(len(expected)==count*2,'output count')
        require(p['fresh_process_count']==5 and p['same_process_iterations']==10,'sample declaration')
        require(len(p['steps'])==6,'six processes')
        names=[]
        for index,s in enumerate(p['steps']):
            container(s);names.append(s['name'])
            require(number(s['import_s']) and type(s['pid']) is int and s['pid']>0,'process/import evidence')
            rows=s['iterations'];require(len(rows)==(1 if index<5 else 10),'iteration count')
            for i,r in enumerate(rows):
                require(r['iteration']==i and r['rc']==0,'iteration/exit')
                require(r['outputs']==expected,'output mismatch')
                require(number(r['elapsed_s']),'entrypoint duration')
                require(type(r['rss_peak_bytes']) is int and r['rss_peak_bytes']>0 and r['rss_scope']=='process cumulative high-water','RSS measurement/scope')
                require(r['cgroup_path']=='/sys/fs/cgroup/memory.peak','cgroup path')
                require((r['cgroup_available'] is True and type(r['cgroup_peak_bytes']) is int and r['cgroup_peak_bytes']>0 and r['cgroup_limit_bytes']==LIMIT) or (r['cgroup_available'] is False and r['cgroup_peak_bytes'] is None),'cgroup availability')
                require(r['real']==count and r['fallback']==0,'renderer provenance')
        cal=p['calibration'];container(cal);names.append(cal['name'])
        require(len(names)==len(set(names)),'unique container identity')
        require(cal['requested_delay_s']==0.1 and number(cal['delay_s']) and cal['delay_s']>=0.09,'delay sensitivity')
        require(cal['allocation_bytes']==32*1024*1024 and type(cal['rss_after']) is int and type(cal['rss_before']) is int and cal['rss_after']-cal['rss_before']>=16*1024*1024,'allocation sensitivity inconclusive or missing')
    except (KeyError,TypeError,ValueError,AttributeError) as e:failures.append(f'malformed resource evidence: {e}')
    return failures

def execute(runtime,image,image_id,inputs,out,iterations):
    from qualify_python_submission import run
    out.mkdir();(out/'output').mkdir();wrapper=out/'probe.py';wrapper.write_text(WRAPPER)
    name='reflow-resource-'+uuid.uuid4().hex
    args=[runtime,'run','--name',name,'--network','none','--memory',str(LIMIT),'--memory-swap',str(LIMIT),'--pids-limit','64',
          '-v',f'{inputs.resolve()}:/app/input:ro','-v',f'{(out/"output").resolve()}:/app/output',
          '-v',f'{out.resolve()}:/profile','-v',f'{wrapper.resolve()}:/probe.py:ro','--entrypoint','python',image,'/probe.py',str(iterations)]
    result={'name':name,'image_id':None,'exit':None,'timed_out':None,'running':None,'absent':False}
    try:
        r=run('run',args,180,out);result.update(exit=r['code'],timed_out=r['timed_out'],outer_s=r['duration_s'])
        if r['timed_out']:run('kill',[runtime,'kill',name],10,out)
        for line in (out/'run.stdout').read_text().splitlines():
            if line.startswith('RESOURCE '):result.update(json.loads(line[9:]))
        ir=run('inspect',[runtime,'inspect',name],10,out)
        if ir['code']==0 and not ir['timed_out']:
            info=json.loads((out/'inspect.stdout').read_text())[0]
            if info['Name']!='/'+name:raise ValueError('container identity mismatch')
            result.update(image_id=info['Image'],network=info['HostConfig']['NetworkMode'],memory=info['HostConfig']['Memory'],memory_swap=info['HostConfig']['MemorySwap'],running=info['State']['Running'],state_exit=info['State']['ExitCode'],
                          input_readonly=any(m['Destination']=='/app/input' and m['RW'] is False and m['Source']==str(inputs.resolve()) for m in info['Mounts']))
            if info['State']['ExitCode']!=r['code']:raise ValueError('exit mismatch')
        for row in result.get('iterations',[]):
            if hashes(out/('iteration-'+str(row['iteration'])))!=row['outputs']:raise ValueError('archived outputs differ')
    except Exception as e:result['error']=f'{type(e).__name__}: {e}'
    finally:
        rr=run('remove',[runtime,'rm','-f',name],10,out);result['cleanup_exit']=rr['code']
        ar=run('absence',[runtime,'inspect',name],10,out)
        result['absent']=ar['code']==1 and not ar['timed_out'] and any(t in (out/'absence.stderr').read_text().lower() for t in ('no such object','no such container'))  # Docker 29 prints lower case
        (out/'sample.json').write_text(json.dumps(result,indent=2)+'\n')
    return result

def qualify(runtime,image,image_id,inputs,out,expected):
    out=Path(out);inputs=Path(inputs)
    if out.exists() or out.is_symlink():raise ValueError('refusing existing resource directory')
    out.mkdir(parents=True);snapshot=out/'inputs';shutil.copytree(inputs,snapshot)
    p={'image_id':image_id,'fresh_process_count':5,'same_process_iterations':10,'inputs_before':hashes(snapshot),'expected_outputs':expected,'steps':[],
       'limits':['Five fresh containers may use host caches; no cold-cache or percentile claim','Warm first iteration is warmup; nine steady-process repeats','RSS and cgroup peak cumulative over process lifetime, not per-iteration peaks','Entry timer excludes imports/hash/copy instrumentation; outer timer includes it','No parse/font/layout phase breakdown; no dense/extreme workload or official budget claim']}
    p['calibration']=execute(runtime,image,image_id,snapshot,out/'calibration','calibration')
    for i in range(6):p['steps'].append(execute(runtime,image,image_id,snapshot,out/f'process-{i}',1 if i<5 else 10))
    p['inputs_after']=hashes(snapshot);p['failures']=evaluate(p)
    p['failures'] += [s['error'] for s in [p['calibration'],*p['steps']] if s.get('error')]
    p['container_memory_coverage']='complete' if all(r['cgroup_available'] for s in p['steps'] for r in s.get('iterations',[])) else 'partial'
    p['pass']=not p['failures'];(out/'profile.json').write_text(json.dumps(p,indent=2)+'\n')
    return 0 if p['pass'] else 1

def main():
    a=argparse.ArgumentParser()
    for flag in ('runtime','image','image-id','input','out','expected'):a.add_argument('--'+flag,required=True)
    p=a.parse_args();return qualify(p.runtime,p.image,p.image_id,p.input,p.out,json.loads(Path(p.expected).read_text())['outputs_sha256'])
if __name__=='__main__':sys.exit(main())
