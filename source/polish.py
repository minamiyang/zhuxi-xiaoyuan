import bpy, math, random, ast
from pathlib import Path
from mathutils import Vector, Euler, Matrix
from math import sin,cos,pi,sqrt
ROOT=Path(__file__).resolve().parents[1];BLOCK=False
scene=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=scene
# Reuse only our authored geometry helper definitions, not scene construction side effects.
for filename in ['build_scene.py','details.py']:
 tree=ast.parse((ROOT/'source'/filename).read_text());defs=[n for n in tree.body if isinstance(n,ast.FunctionDef)]
 exec(compile(ast.Module(body=defs,type_ignores=[]),filename,'exec'))
COL=bpy.data.collections.new('10 · 覆羽、绒毛与石缝苔');scene.collection.children.link(COL)
sources=bpy.data.collections['植物几何源 · 仅供实例']
random.seed(177)
featherm=[]
for i,c in enumerate([(.47,.19,.025),(.61,.26,.039),(.31,.10,.02),(.22,.16,.084),(.42,.32,.17),(.58,.47,.30)]):
 m=mat('细羽片_%d'%i,c,.67);n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Sheen Weight'].default_value=.2
 noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=135;noise.inputs['Detail'].default_value=2
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.27;bump.inputs['Distance'].default_value=.002;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal']);featherm.append(m)
feathers=[leaf_source('细羽曲面源_%d'%i,'elm',m) for i,m in enumerate(featherm)]
for name in ['母鸡','溪鸭 1','溪鸭 2']:
 root=bpy.data.objects[name];duck='鸭' in name
 center=Vector((0,0,.22 if duck else .50));rad=Vector((.208,.35,.174) if duck else (.238,.344,.258));sets=[([],[],[]) for i in range(3)]
 for j in range(310):
  # Head/neck junction stays uncovered; feathers overlap in direction of tail.
  theta=random.uniform(.22,2.0);phi=j*2.399963;norm=Vector((sin(theta)*cos(phi),sin(theta)*sin(phi),cos(theta)))
  p=center+Vector((rad.x*norm.x,rad.y*norm.y,rad.z*norm.z))
  if p.y<-.15 and p.z>center.z+.02:continue
  t=Vector((0,1,-.28));t-=norm*t.dot(norm);t.normalize();x=t.cross(norm).normalized();rot=Matrix((x,t,norm)).transposed().to_euler()
  q=j%3;pp,rr,ss=sets[q];pp.append(tuple(p));rr.append(tuple(rot));s=random.uniform(.055,.10);ss.append((s*.88,s,s))
 for i,(p,r,s) in enumerate(sets):
  ob=instances(name+' · 细密覆羽 '+str(i),feathers[i+(3 if duck else 0)],p,r,s)
  if ob:ob.parent=root
# Very fine silhouette fuzz on chicks, a single native instance field per chick.
fuzz=mat('雏鸡绒毛',(.85,.62,.21),.93)
fuzzsrc=objmesh('绒毛源',[(-.001,0,0),(.001,0,0),(.0005,0,.010),(-.0005,0,.011)],[(0,1,2,3)],fuzz);COL.objects.unlink(fuzzsrc);sources.objects.link(fuzzsrc);fuzzsrc.hide_render=True;fuzzsrc.hide_set(True)
for i in range(1,7):
 root=bpy.data.objects['小鸡 %d'%i];pp=[];rr=[];ss=[]
 for j in range(370):
  a=j*2.399;t=math.acos(random.uniform(-.9,1));n=Vector((sin(t)*cos(a),sin(t)*sin(a),cos(t)))
  c=Vector((0,-.13,.34)) if j%3==0 else Vector((0,0,.19));r=Vector((.096,.099,.099)) if j%3==0 else Vector((.136,.171,.141))
  p=c+Vector((r.x*n.x,r.y*n.y,r.z*n.z));pp.append(tuple(p));rr.append(tuple(n.to_track_quat('Z','Y').to_euler()));ss.append((1,1,random.uniform(.55,1)))
 ob=instances('雏鸡绒羽 '+str(i),fuzzsrc,pp,rr,ss);ob.parent=root
# Short moss tufts stay in humid masonry seams, not on dry tile fields.
moss=mat('石缝苔藓',(.12,.17,.018),.97);mossleaf=leaf_source('苔藓细叶源','grass',moss)
pp=[];rr=[];ss=[]
for j in range(550):
 y=random.uniform(-2.24,-1.16);side=random.choice([-1,1]);x=3.55+.48*sin(-1.7*.58)+.15*cos(-1.7*1.2)+side*random.uniform(1.01,1.33);z=.49+random.uniform(-.025,.02)
 pp.append((x,y,z));rr.append((random.uniform(.3,1.1),random.uniform(-.3,.3),random.uniform(-pi,pi)));s=random.uniform(.03,.07);ss.append((s,s,s))
instances('桥脚贴石苔',mossleaf,pp,rr,ss)
# A modest reduction of lowest bamboo foliage reveals stalks and lit side wall.
for ob in scene.objects:
 if ob.name.startswith('竹叶飞簇'):
  # These are the source point meshes; remove some low points while preserving native distribution attributes.
  import bmesh
  bm=bmesh.new();bm.from_mesh(ob.data);verts=[v for v in bm.verts if v.co.x<-4.5 and v.co.z<2.6 and random.random()<.45]
  bmesh.ops.delete(bm,geom=verts,context='VERTS');bm.to_mesh(ob.data);bm.free()
# Save the production file before temporary detail camera work.
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
for d in p.devices:d.use=d.type=='METAL'
scene.cycles.device='GPU';scene.cycles.samples=64
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
cam=scene.camera;cam.location=(-6,-10,6);cam.rotation_euler=(Vector((-1.0,-1.8,1.05))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.9
scene.render.resolution_x=1300;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'verification/animals_detail.png');bpy.ops.render.render(write_still=True)
