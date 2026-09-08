import bpy,bmesh,json,sys
from mathutils import Vector,Euler
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=s
names=('筒瓦','屋脊','承瓦木基层','山面封檐板','檐口横梁','脊端')
dp=bpy.context.evaluated_depsgraph_get();pts=[]
for ob in s.objects:
 if ob.name.startswith(names):
  ev=ob.evaluated_get(dp);me=ev.to_mesh();pts.extend(ev.matrix_world@v.co for v in me.vertices);ev.to_mesh_clear()
lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
# Conservative complete roof envelope, with 14 cm clearance; maximum tree wind travel is < 5.1 cm.
margin=.14;low=lo-Vector((margin,margin,margin));high=hi+Vector((margin,margin,margin))
def touches(bounds):
 a,b=bounds;return all(b[i]>=low[i] and a[i]<=high[i] for i in range(3))
def box(ps):return (Vector(tuple(min(p[i] for p in ps) for i in range(3))),Vector(tuple(max(p[i] for p in ps) for i in range(3))))
counts=[]
for ob in s.objects:
 if not ob.name.startswith('榆树分层叶冠'):continue
 me=ob.data;rot=me.attributes['rotation'];size=me.attributes['size'];mod=next(m for m in ob.modifiers if m.type=='NODES');src=next(n.inputs['Object'].default_value for n in mod.node_group.nodes if n.bl_idname=='GeometryNodeObjectInfo');leaf=[v.co.copy() for v in src.data.vertices];remove=[]
 for v in me.vertices:
  rotation=Euler(rot.data[v.index].vector,'XYZ').to_matrix();sc=size.data[v.index].vector
  ps=[ob.matrix_world@(v.co+rotation@Vector((p.x*sc.x,p.y*sc.y,p.z*sc.z))) for p in leaf]
  if touches(box(ps)):remove.append(v.index)
 counts.append({'object':ob.name,'before':len(me.vertices),'removed':len(remove)})
 if '--apply' in sys.argv and remove:
  bm=bmesh.new();bm.from_mesh(me);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS');bm.to_mesh(me);bm.free();me.update()
branches=[]
for ob in s.objects:
 if not ob.name.startswith(('一级分枝','二级细枝')):continue
 ev=ob.evaluated_get(dp);me=ev.to_mesh();ps=[ev.matrix_world@v.co for v in me.vertices];ev.to_mesh_clear()
 if not touches(box(ps)):continue
 branches.append({'object':ob.name,'bounds':[list(x) for x in box(ps)]})
 if '--apply' in sys.argv:
  # Trim the inner spray's reach, preserving its connection to the unmodified parent trunk.
  for sp in ob.data.splines:
   for point in sp.bezier_points:
    world=ob.matrix_world@point.co
    if low.y-.15<world.y<high.y+.15 and low.z-.25<world.z<high.z+.25 and world.x<high.x+.12:
     delta=high.x+.12-world.x;point.co.x+=delta;point.handle_left.x+=delta;point.handle_right.x+=delta
report={'roofBounds':[list(lo),list(hi)],'margin':margin,'leafSets':counts,'branchesAdjusted':branches}
print(json.dumps(report,ensure_ascii=False),flush=True)
if '--apply' in sys.argv:
 s['roof_tree_clearance_revision']='20260908: complete leaf pruning and branch setback, 0.14 m roof envelope margin'
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
 (ROOT/'verification/树冠屋瓦间隙/native-repair.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
