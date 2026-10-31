#!/usr/bin/env python3
"""Mounted diagnostic only. cProfile cumulative phases overlap; never sum them."""
import cProfile,inspect,json,math,pstats,sys,time,traceback
from pathlib import Path

def identity(fn):
    fn=inspect.unwrap(fn);code=getattr(fn,'__code__',None)
    return (code.co_filename,code.co_firstlineno,code.co_name) if code else None

def profile_call(fn,targets):
    identities={name:identity(target) for name,target in targets.items()}
    profiler=cProfile.Profile(timer=time.perf_counter);start=time.perf_counter();error=None;stack=None
    try:rc=profiler.runcall(fn);rc=0 if rc is None else rc
    except Exception as e:rc=1;error=f'{type(e).__name__}: {e}';stack=traceback.format_exc()
    elapsed=time.perf_counter()-start;stats=pstats.Stats(profiler).stats;phases={}
    for name,key in identities.items():
        row=stats.get(key)
        phases[name]={'code':list(key) if key else None,'observed':row is not None,'calls':row[1] if row else 0,
                      'primitive_calls':row[0] if row else 0,'self_s':row[2] if row else None,'cumulative_s':row[3] if row else None}
    return {'entry_exit':rc,'error':error,'traceback':stack,'elapsed_s':elapsed,'phases':phases}

def main():
    started=time.perf_counter()
    import resource
    sys.path.insert(0,'/app')
    import engine.main as em
    import engine.text_fit as fit
    import renderer.converter.convert as conv
    delay=sys.argv[1] if len(sys.argv)>1 else ''
    targets={'read_text':Path.read_text,'parse':json.loads,'serialize':json.dumps,'layout':em.resize,
             'font_load':fit._font,'font_measure_block':fit._block,'font_renderer_widths':fit._renderer_widths,
             'renderer_font_setup':conv.load_brand_font_manager,'asset_load':conv.load_asset_image,
             'render_export':conv.render_design_to_png,'write_json':Path.write_text,'write_png':Path.write_bytes}
    if hasattr(fit,'_unsupported_text'):targets['font_support_guard']=fit._unsupported_text
    real=0;fallback=0;findings=[];self_checks=[]
    original_render=conv.render_design_to_png;original_fallback=em._fallback_render;original_check=em.self_check
    def render(*a,**kw):
        nonlocal real
        real+=1;result=original_render(*a,**kw)
        if result:findings.extend(result)
        return result
    def fallback_render(*a,**kw):
        nonlocal fallback
        fallback+=1;return original_fallback(*a,**kw)
    def self_check(*a,**kw):
        result=original_check(*a,**kw);self_checks.extend(result);return result
    conv.render_design_to_png=render;em._fallback_render=fallback_render;em.self_check=self_check
    if delay=='parse':
        original_parse=json.loads
        def delayed_parse(*a,**kw):time.sleep(.05);return original_parse(*a,**kw)
        json.loads=delayed_parse;targets['parse']=delayed_parse
    elif delay=='render_export':
        def delayed_render(*a,**kw):time.sleep(.05);return render(*a,**kw)
        conv.render_design_to_png=delayed_render;targets['render_export']=delayed_render
    import_s=time.perf_counter()-started
    result=profile_call(em.main,targets)
    def kernel(name):
        try:return int(Path('/sys/fs/cgroup/'+name).read_text())
        except (OSError,ValueError):return None
    result.update(import_s=import_s,real=real,fallback=fallback,renderer_findings=findings,self_check_findings=self_checks,
                  rss_peak_bytes=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024,
                  cgroup_peak_bytes=kernel('memory.peak'),cgroup_limit_bytes=kernel('memory.max'),
                  measurement_scope='Linux process cumulative RSS; cgroup charged memory incl filesystem cache; instrumentation included',
                  phase_scope='Actual function code identities, self and cumulative seconds; nested cumulative phases are NOT additive',
                  delay_phase=delay or None,requested_delay_s=.05 if delay else 0)
    Path('/profile/phase.json').write_text(json.dumps(result,indent=2)+'\n')
    if result['traceback']:print(result['traceback'],file=sys.stderr)
    return result['entry_exit']

if __name__=='__main__':sys.exit(main())
