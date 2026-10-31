import json,os,shutil,subprocess,sys,tempfile
from pathlib import Path
U="/home/nala/.local/share/reflow-runtime/chameleon-a44a060"
PY="/home/nala/.local/share/reflow-runtime/chameleon-venv311/bin/python"
SL="/home/nala/.local/share/reflow-runtime/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu"
src={"source":json.load(open(U+"/input/chameleon_sample_level3_advanced.json"))["source"]}
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
for name,(w,h),al in (("L3_1080x1350",(1080,1350),None),("L3_120x600",(120,600),None)):
    c=json.loads(json.dumps(src)); c["task_id"]=name; c["target_canvas"]={"width":w,"height":h}
    if al:
        for e in c["source"]["elements"]:
            if e["id"]=="ribbon_label": e["text_align"]=al
    t=Path(tempfile.mkdtemp()).resolve(); shutil.copytree(U,t,dirs_exist_ok=True); shutil.rmtree(t/"input");(t/"input").mkdir();(t/"output").mkdir(exist_ok=True)
    for p in Path("engine").glob("*.py"): shutil.copy(p,t/"engine"/p.name)
    (t/"input"/f"{name}.json").write_text(json.dumps(c)); (out/f"{name}_input.json").write_text(json.dumps(c,indent=1))
    r=subprocess.run([PY,"-c","import engine.main as em;print('exit',em.main())"],cwd=t,capture_output=True,text=True,env=dict(os.environ,LD_LIBRARY_PATH=SL))
    print(name,r.stdout.strip()[-40:],r.stderr[-200:])
    for e in("json","png"):
        f=t/"output"/f"{name}_output.{e}"
        if f.exists(): shutil.copy(f,out/f.name)
    shutil.rmtree(t)
