import json,sys,engine.text_fit as tf
from engine.resize import resize
c=json.load(open(sys.argv[1])); o={e["id"]:e for e in resize(c["source"],c["target_canvas"])["elements"]}
hit=lambda a,b:a[0]<b[2] and b[0]<a[2] and a[1]<b[3] and b[1]<a[3]
print(sys.argv[2],tf.__file__.split("/")[2:4],"h overlaps card/dot:",hit(tf.aabb(o["h"]),tf.aabb(o["card"])),hit(tf.aabb(o["h"]),tf.aabb(o["dot"])),[round(v,1) for v in tf.aabb(o["h"])])
