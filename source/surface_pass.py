import bpy, math, random, ast
from pathlib import Path
from mathutils import Vector, Euler, Matrix
from math import sin,cos,pi,sqrt
ROOT=Path(__file__).resolve().parents[1];BLOCK=False
scene=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=scene
for filename in ['build_scene.py','details.py']:
 tree=ast.parse((ROOT/'source'/filename).read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)],type_ignores=[]),filename,'exec'))
COL=bpy.data.collections.new('11 · 微表面与自然地被');scene.collection.children.link(COL);sources=bpy.data.collections['植物几何源 · 仅供实例']
# Leaf veins in each leaf's generated coordinates; two independent scales plus satin microrelief.
for ma in bpy.data.materials:
 if not ma.name.startswith('叶色'):continue
 n=ma.node_tree.nodes;l=ma.node_tree.links;bs=n.get('Principled BSDF');basecolor=tuple(bs.inputs['Base Color'].default_value)
 tex=n.new('ShaderNodeTexCoord');xyz=n.new('ShaderNodeSeparateXYZ');l.new(tex.outputs['Generated'],xyz.inputs[0])
 def mathn(op,a,b=None):
  z=n.new('ShaderNodeMath');z.operation=op
  if hasattr(a,'node'):l.new(a,z.inputs[0])
  else:z.inputs[0].default_value=a
  if b is not None:
   if hasattr(b,'node'):l.new(b,z.inputs[1])
   else:z.inputs[1].default_value=b
  return z.outputs[0]
 dx=mathn('ABSOLUTE',mathn('SUBTRACT',xyz.outputs['X'],.5));main=mathn('LESS_THAN',dx,.018)
 diag=mathn('ADD',mathn('MULTIPLY',dx,1.2),xyz.outputs['Y']);waves=mathn('PINGPONG',diag,.125);side=mathn('LESS_THAN',waves,.009);veins=mathn('MAXIMUM',main,side)
 noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4;noise.inputs['Detail'].default_value=3;l.new(tex.outputs['Generated'],noise.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*(c*.50 for c in basecolor[:3]),1);ramp.color_ramp.elements[1].color=(*(c*1.03 for c in basecolor[:3]),1);l.new(noise.outputs['Fac'],ramp.inputs[0])
 mix=n.new('ShaderNodeMixRGB');l.new(mathn('MULTIPLY',veins,.25),mix.inputs[0]);l.new(ramp.outputs[0],mix.inputs[1]);mix.inputs[2].default_value=(*(c*.50 for c in basecolor[:3]),1);l.new(mix.outputs[0],bs.inputs['Base Color'])
 bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.003;bump.inputs['Strength'].default_value=.28;l.new(veins,bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal']);bs.inputs['Roughness'].default_value=.57
# Darker, aged joinery; retain directional fine grain.
for name,factor in [('旧杉木 · 顺纹',.60),('竹木 · 蜜色旧表皮',.80)]:
 ma=bpy.data.materials[name];ma.diffuse_color=(*(c*factor for c in ma.diffuse_color[:3]),1)
 for node in ma.node_tree.nodes:
  if node.type=='VALTORGB':
   for e in node.color_ramp.elements:e.color=(*(c*factor for c in e.color[:3]),1)
# Bark has long fissures and fine grain with different physical scales.
ma=bpy.data.materials['老树树皮'];n=ma.node_tree.nodes;l=ma.node_tree.links;bs=n.get('Principled BSDF');old=bs.inputs['Normal'].links[0].from_socket
tex=n.new('ShaderNodeTexCoord');v=n.new('ShaderNodeVectorMath');v.operation='MULTIPLY';v.inputs[1].default_value=(6,6,.6);l.new(tex.outputs['Object'],v.inputs[0]);no=n.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=4;no.inputs['Detail'].default_value=3;l.new(v.outputs[0],no.inputs['Vector']);bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.065;bump.inputs['Strength'].default_value=.55;l.new(no.outputs['Fac'],bump.inputs['Height']);l.new(old,bump.inputs['Normal']);l.new(bump.outputs[0],bs.inputs['Normal'])
# Root contact: reshape a peninsula from the left stream bank beneath the whole tree root ball.
terrain=bpy.data.objects['连通地形 · 溪床下切']
for v in terrain.data.vertices:
 x,y,z=v.co;d=sqrt(((x-3.30)/.70)**2+((y-.91)/.93)**2)
 if d<1:
  target=.44+.015*cos(x*7+y*4)
  strength=min(1,(1-d)*4)
  v.co.z=max(z,z*(1-strength)+target*strength)
terrain.data.update()
# Natural dry crumbs at several sizes, concentrated away from the water and buildings.
random.seed(65);clodmat=mat('院土细碎团粒',(.22,.145,.07),.98,'soil')
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);src=move_col(bpy.context.object);src.name='自制土粒源';src.data.materials.append(clodmat);COL.objects.unlink(src);sources.objects.link(src);src.hide_render=True;src.hide_set(True)
pp=[];rr=[];ss=[]
for i in range(8000):
 x=random.uniform(-5.7,5.7);y=random.uniform(-4.85,4.85)
 if not open_ground(x,y):continue
 if abs(y+1.7)<.68 and abs(x-(3.55+.48*sin(-1.7*.58)+.15*cos(-1.7*1.2)))<1.6:continue
 sz=random.uniform(.006,.026);pp.append((x,y,h(x,y)+sz*.2));rr.append((random.random(),random.random(),random.uniform(-pi,pi)));ss.append((sz,sz*.8,sz*.5))
instances('细碎土粒',src,pp,rr,ss)
# Replace rounded wing rods by overlapping, pointed feather sheets.
root=bpy.data.objects['母鸡']
for ob in scene.objects:
 if ob.name.startswith('母鸡 · 层叠翅羽') or ob.name.startswith('母鸡 · 弧形尾羽') or ob.name.startswith('母鸡 · 尾羽金边'):
  ob.hide_render=True;ob.hide_set(True)
for side in (-1,1):
 pp=[];rr=[];ss=[]
 for row in range(3):
  for j in range(9):
   p=Vector((side*(.213+.019*row),-.155+j*.029,.635-row*.065));n=Vector((side,0,.22)).normalized();t=Vector((0,.75,-.62)).normalized();x=t.cross(n).normalized();t=n.cross(x).normalized();rot=Matrix((x,t,n)).transposed().to_euler()
   pp.append(tuple(p));rr.append(tuple(rot));ss.append((.16,.18+row*.028,.16))
 ob=instances('母鸡 · 分层长翼羽 '+str(side),bpy.data.objects['细羽曲面源_1'],pp,rr,ss);ob.parent=root
# Long thin tail feathers follow individual arcs and share a physical quill attachment.
tailma=bpy.data.materials['尾羽深褐'];quillma=bpy.data.materials['颈羽金黄']
for j in range(11):
 a=(j-5)*.11;vs=[];fs=[]
 for i in range(13):
  t=i/12;xx=a*.50*t;yy=.21+.34*sin(t*pi*.66);zz=.59+.48*t-abs(a)*.17*t;w=.036*sin(pi*t)**.55
  vs.extend([(xx-w,yy,zz-.005),(xx,yy-.007,zz+.006),(xx+w,yy,zz-.005)])
 for i in range(12):k=i*3;fs.extend([(k,k+3,k+4,k+1),(k+1,k+4,k+5,k+2)])
 ob=objmesh('母鸡 · 片状尾羽_%02d'%j,vs,fs,tailma);smooth(ob);ob.parent=root;sol=ob.modifiers.new('尾羽薄壳','SOLIDIFY');sol.thickness=.003
 ob=curve('母鸡 · 尾羽细羽轴',[(a*.50*t,.21+.34*sin(t*pi*.66)-.009,.59+.48*t-abs(a)*.17*t+.007) for t in [0,.25,.5,.75,.95]],.0027,quillma,[1,.8,.6,.4,.05],1);ob.parent=root
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
for d in p.devices:d.use=d.type=='METAL'
scene.cycles.device='GPU';scene.cycles.samples=80
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
scene.render.filepath=str(ROOT/'verification/surface_final_preview.png');bpy.ops.render.render(write_still=True)
