import bpy,math,random,ast
from pathlib import Path
from mathutils import Vector,Euler
from math import sin,cos,pi,sqrt
ROOT=Path(__file__).resolve().parents[1];BLOCK=False
scene=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=scene
for filename in ['build_scene.py','details.py']:
 tree=ast.parse((ROOT/'source'/filename).read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)],type_ignores=[]),filename,'exec'))
COL=bpy.data.collections.new('12 · 树根岸线收口');scene.collection.children.link(COL);sources=bpy.data.collections['植物几何源 · 仅供实例']
random.seed(204)
# Break the visibly smooth new peninsula rim with embedded bank stones and sedges.
pp=[];rr=[];ss=[]
for i in range(42):
 a=i*2.3999;r=random.uniform(.30,.52);x=3.30+r*cos(a);y=.91+r*1.18*sin(a)
 if abs(x-3.35)<.23 and abs(y-.9)<.24:continue
 sz=random.uniform(.047,.095);pp.append((x,y,.443));rr.append((random.random(),random.random(),random.random()*pi));ss.append((sz,sz*.8,sz*.53))
instances('树根半埋石',bpy.data.objects['自制风化卵石源'],pp,rr,ss)
for q in range(3):
 pp=[];rr=[];ss=[]
 for i in range(230):
  a=random.uniform(0,2*pi);r=random.uniform(.30,.55);x=3.30+r*cos(a);y=.91+r*1.22*sin(a)
  if abs(x-3.35)<.20 and abs(y-.9)<.22:continue
  d=sqrt(((x-3.30)/.70)**2+((y-.91)/.93)**2)
  if d>.74:continue
  pp.append((x,y,.438));rr.append((random.uniform(.45,1.2),random.uniform(-.3,.3),a));s=random.uniform(.10,.22);ss.append((s,s,s))
 instances('树根莎草 '+str(q),bpy.data.objects['草叶 '+str(q+1)],pp,rr,ss)
# Keep duck feather edges subtle: small overlapping mottles, not oversized scale plates.
for ob in scene.objects:
 if ob.name.startswith('溪鸭') and '细密覆羽' in ob.name:
  a=ob.data.attributes.get('size')
  if a:
   for v in a.data:v.vector*=.48
for i,c in enumerate([(.43,.35,.23),(.48,.39,.255),(.52,.43,.28)],3):
 ma=bpy.data.materials['细羽片_%d'%i];ma.diffuse_color=(*c,1);ma.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
