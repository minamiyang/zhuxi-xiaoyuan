import bpy,ast,random,math,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi,sqrt
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=scene
for filename,funcnames in [('build_scene.py',{'objmesh','curve','box','bevel'}),('details.py',{'instances'})]:
 tree=ast.parse((ROOT/'source'/filename).read_text());defs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in funcnames];exec(compile(ast.Module(body=defs,type_ignores=[]),filename,'exec'))
def bounds(ob):
 ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());pts=[ev.matrix_world@Vector(p) for p in ev.bound_box];return [[min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]]
COL=bpy.data.collections['02B · 门窗细木作与墙脚']
old=[ob for ob in scene.objects if ob.name.startswith('墙脚')];stone=old[0].data.materials[0]
doors=[ob for ob in scene.objects if ob.name.startswith('门框立柱')];db=[bounds(o) for o in doors];left=min(b[0][0] for b in db)-.022;right=max(b[1][0] for b in db)+.022
for ob in old:bpy.data.objects.remove(ob,do_unlink=True)
counts={}
def course(name,a,b,axis,fixed,z,row):
 # Trim cells at actual corners and opening edges; keep full timber jambs exposed.
 step=.49;origin=-4.147 if axis==0 else .159;origin-=row*.245
 for i in range(-1,24):
  lo=max(a,origin+i*step+.006);hi=min(b,origin+(i+1)*step-.006)
  if hi-lo<.035:continue
  p=[(lo+hi)/2,fixed,z] if axis==0 else [fixed,(lo+hi)/2,z];sz=[hi-lo,.26,.20] if axis==0 else [.26,hi-lo,.20]
  box(name,p,sz,stone,.018);counts[name]=counts.get(name,0)+1
for row in range(2):
 z=.62+row*.21
 course('墙脚前砌石',-4.147,left,0,.017,z,row);course('墙脚前砌石',right,1.447,0,.017,z,row)
 course('墙脚后砌石',-4.147,1.447,0,3.733,z,row)
 course('墙脚左砌石',.159,3.591,1,-4.017,z,row);course('墙脚右砌石',.159,3.591,1,1.317,z,row)
# Actual curved roof geometry, including tile ridges, defines the local contact surface.
roofObjects=[o for o in scene.objects if o.name.startswith(('筒瓦_','屋脊搭接帽瓦','山面封檐板','承瓦木基层','脊端'))]
verts=[];faces=[];dp=bpy.context.evaluated_depsgraph_get()
for ob in roofObjects:
 ev=ob.evaluated_get(dp);me=ev.to_mesh();n=len(verts);verts.extend(ev.matrix_world@v.co for v in me.vertices);faces.extend(tuple(n+i for i in p.vertices) for p in me.polygons);ev.to_mesh_clear()
roof=BVHTree.FromPolygons(verts,faces)
roofmax=max(p.x for p in verts);roofminy=min(p.y for p in verts);roofmaxy=max(p.y for p in verts)
def roofheight(x,y,radius):
 if x>roofmax+radius or y<roofminy-radius or y>roofmaxy+radius:return None
 heights=[]
 for dx,dy in [(0,0),(-radius,0),(radius,0),(0,-radius),(0,radius),(-radius,-radius),(-radius,radius)]:
  hit,normal,index,dist=roof.ray_cast(Vector((x+dx,y+dy,8)),Vector((0,0,-1)),8)
  if hit is not None:heights.append(hit.z)
 return max(heights) if heights else None
COL=bpy.data.collections['05 · 榆树与竹林']
for ob in list(scene.objects):
 if ob.name.startswith(('主干 · 起伏收径','盘根','树皮纵向沟脊','一级分枝','二级细枝','榆树分层叶冠')):bpy.data.objects.remove(ob,do_unlink=True)
bark=bpy.data.materials['老树树皮'];woodLight=bpy.data.materials['竹木 · 蜜色旧表皮'];leafm=[bpy.data.materials['叶色%02d'%i] for i in range(6)];leafsrc=[bpy.data.objects['榆叶原型 '+str(i)] for i in range(6)]
# Keep the original branch spreads and all original leaf clouds. Only local roof contacts rise.
original_curve=curve;branch_adjustments=0

def curve(name,pts,radius,*args,**kwargs):
 global branch_adjustments
 if name.startswith(('一级分枝','二级细枝')):
  new=[]
  for point in pts:
   p=Vector(point);h=roofheight(p.x,p.y,radius+.06)
   if h is not None and p.z<h+radius+.06:p.z=h+radius+.06;branch_adjustments+=1
   new.append(p)
  pts=new
 return original_curve(name,pts,radius,*args,**kwargs)
original_instances=instances;leaf_adjustments=0;max_lift=0

def instances(name,src,points,rots,scales):
 global leaf_adjustments,max_lift
 adjusted=[]
 for pos,scale in zip(points,scales):
  p=Vector(pos);r=max(scale)*1.05;h=roofheight(p.x,p.y,r+.045)
  if h is not None and abs(p.z-h)<r+.035:
   max_lift=max(max_lift,h+r+.045-p.z);p.z=h+r+.045;leaf_adjustments+=1
  adjusted.append(tuple(p))
 return original_instances(name,src,adjusted,rots,scales)
src=(ROOT/'source/details.py').read_text();section=src[src.index('random.seed(403)'):src.index('# Bamboo, actual nodes')];exec(compile(section,'original-crown-local-clearance','exec'))
scene['roof_tree_clearance_revision']='Original full crown restored: no horizontal reshaping; only locally raise leaves contacting evaluated curved roof.'
bpy.context.view_layer.update()
# Mesh envelope proof for the masonry/timber junction.
contacts=[]
for ob in scene.objects:
 if not ob.name.startswith('墙脚'):continue
 b=bounds(ob)
 for door,d in zip(doors,db):
  if all(b[0][i]<d[1][i] and b[1][i]>d[0][i] for i in range(3)):contacts.append([ob.name,door.name])
report={'masonry':counts,'jamb_bounds':db,'opening_clearance':[left,right],'stone_jamb_overlaps':contacts,'restored_leaves':24800,'locally_raised_leaves':leaf_adjustments,'adjusted_branch_points':branch_adjustments,'max_leaf_lift':max_lift,'roof_bounds':[[min(p[i] for p in verts) for i in range(3)],[max(p[i] for p in verts) for i in range(3)]]}
assert not contacts,contacts
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
(ROOT/'verification/墙脚树冠配乐修订/geometry.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('REPAIR_COMPLETE',json.dumps(report,ensure_ascii=False),flush=True)
