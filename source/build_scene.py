import bpy, math, random, json, sys, os
from pathlib import Path
from mathutils import Vector, Euler
from math import sin,cos,pi,sqrt
ROOT=Path(__file__).resolve().parents[1]
BLOCK='--blockout' in sys.argv
random.seed(2808)
# This is a new, isolated production file. No existing scene is loaded or modified.
scene=bpy.data.scenes.new('竹溪小院 · 午后有风')
bpy.context.window.scene=scene
COL=None

def collection(name):
 global COL
 COL=bpy.data.collections.new(name); scene.collection.children.link(COL); print(name,flush=True); return COL

def objmesh(name,vs,fs,mat=None):
 me=bpy.data.meshes.new(name); me.from_pydata(vs,[],fs); me.update()
 ob=bpy.data.objects.new(name,me); COL.objects.link(ob)
 if mat: me.materials.append(mat)
 return ob

def move_col(ob):
 for c in list(ob.users_collection):c.objects.unlink(ob)
 COL.objects.link(ob)
 return ob

def bevel(ob,w=.035,n=3):
 mod=ob.modifiers.new('真实圆角','BEVEL'); mod.width=w; mod.segments=n
 return ob

def smooth(ob):
 for f in ob.data.polygons:f.use_smooth=True
 return ob

def box(name,p,s,mat,w=.025):
 x,y,z=[v/2 for v in s]
 vs=[(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]
 ob=objmesh(name,vs,[(2,6,4,0),(5,7,3,1),(4,5,1,0),(3,7,6,2),(1,3,2,0),(6,7,5,4)],mat);ob.location=p
 if w:bevel(ob,w)
 return ob

def uvball(name,p,s,mat,seg=20,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=p)
 ob=move_col(bpy.context.object);ob.name=name;ob.scale=s;ob.data.materials.append(mat);smooth(ob);return ob

def curve(name,pts,r,mat,radii=None,res=3):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=r;cu.bevel_resolution=res
 sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for i,(b,p) in enumerate(zip(sp.bezier_points,pts)):
  b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
  if radii:b.radius=radii[i]
 ob=bpy.data.objects.new(name,cu);COL.objects.link(ob);cu.materials.append(mat);return ob

def rod(name,a,b,r,mat,r2=None,vertices=12):
 a,b=Vector(a),Vector(b);v=b-a
 bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=v.length,location=(a+b)/2)
 ob=move_col(bpy.context.object);ob.name=name;ob.rotation_euler=v.to_track_quat('Z','Y').to_euler();ob.data.materials.append(mat);smooth(ob);return ob

def mat(name,c,rough=.7,kind=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 n=m.node_tree.nodes;l=m.node_tree.links;b=n.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=rough
 if kind and not BLOCK:
  tex=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';l.new(tex.outputs['Object'],mapping.inputs[0])
  mapping.inputs[1].default_value={'wood':(9,9,.75),'bark':(8,8,1.2),'stone':(1,1,1),'plaster':(1,1,1),'soil':(1,1,1),'tile':(1,1,1)}.get(kind,(1,1,1))
  noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value={'wood':3,'bark':3,'stone':6,'plaster':4,'soil':3,'tile':14}.get(kind,4);noise.inputs['Detail'].default_value=4
  l.new(mapping.outputs[0],noise.inputs['Vector'])
  ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.22;ramp.color_ramp.elements[0].color=(*(v*.63 for v in c),1);ramp.color_ramp.elements[1].position=.78;ramp.color_ramp.elements[1].color=(*(min(1,v*1.18) for v in c),1)
  l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],b.inputs['Base Color'])
  micro=n.new('ShaderNodeTexNoise');micro.inputs['Scale'].default_value=110 if kind in ('plaster','stone') else 65;micro.inputs['Detail'].default_value=2;l.new(mapping.outputs[0],micro.inputs['Vector'])
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.32;bump.inputs['Distance'].default_value=.024 if kind!='wood' else .016;l.new(micro.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],b.inputs['Normal'])
  roughmap=n.new('ShaderNodeMapRange');roughmap.inputs['From Min'].default_value=0;roughmap.inputs['From Max'].default_value=1;roughmap.inputs['To Min'].default_value=rough-.12;roughmap.inputs['To Max'].default_value=min(.98,rough+.1);l.new(micro.outputs['Fac'],roughmap.inputs['Value']);l.new(roughmap.outputs[0],b.inputs['Roughness'])
 return m

stone=mat('青灰砂岩 · 颗粒与风化',(.34,.32,.25),.89,'stone')
stoneLight=mat('桥石 · 暖灰石灰岩',(.49,.46,.36),.84,'stone')
plaster=mat('米白灰泥 · 石灰颗粒',(.73,.68,.52),.9,'plaster')
wood=mat('旧杉木 · 顺纹',(.24,.115,.047),.72,'wood')
woodLight=mat('竹木 · 蜜色旧表皮',(.39,.245,.085),.65,'wood')
bark=mat('老树树皮',(.18,.135,.065),.95,'bark')
tile=mat('青灰筒瓦 · 陶土微孔',(.245,.245,.215),.87,'tile')
tileedge=mat('瓦口磨损',(.30,.29,.245),.88,'tile')
soil=mat('压实院土 · 土粒',(.43,.32,.19),.97,'soil')
bed=mat('湿润河床',(.145,.155,.075),.86,'soil')
base=mat('炭灰展示底座',(.095,.094,.083),.56)
leafm=[mat('叶色%02d'%i,c,.72) for i,c in enumerate([(.15,.245,.035),(.23,.33,.05),(.32,.41,.075),(.095,.19,.018),(.37,.43,.09),(.195,.28,.026)])]
for m in leafm:
 b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Subsurface Weight'].default_value=.07;b.inputs['Subsurface Radius'].default_value=(.6,1,.25)
bamboo=mat('竹秆 · 黄绿色蜡皮',(.245,.31,.036),.44,'wood')
watermat=mat('溪水 · 透射与水面微波',(.32,.37,.23),.12)
b=watermat.node_tree.nodes.get('Principled BSDF');b.inputs['Transmission Weight'].default_value=.93;b.inputs['IOR'].default_value=1.333
if not BLOCK:
 n=watermat.node_tree.nodes;l=watermat.node_tree.links;t=n.new('ShaderNodeTexNoise');t.inputs['Scale'].default_value=8;t.inputs['Detail'].default_value=3
 u=n.new('ShaderNodeBump');u.inputs['Strength'].default_value=.25;u.inputs['Distance'].default_value=.035;l.new(t.outputs['Fac'],u.inputs['Height']);l.new(u.outputs[0],b.inputs['Normal'])

collection('01 · 土地与溪流')
box('完整展示底座',(0,0,.08),(11.8,10,.62),base,.055)
def river(y):return 3.55+.48*sin(y*.58)+.15*cos(y*1.2)
def width(y):return .72+.16*cos(y*.8)
def h(x,y):return .435+.045*sin(x*1.7+y*.9)*sin(y*1.3)+.014*cos(x*6+y*3)
# Rectilinear soil grid with depressed river bed, continuous closed thickness.
vs=[];fs=[];nx=180;ny=150
for j in range(ny+1):
 y=-4.95+9.9*j/ny
 for i in range(nx+1):
  x=-5.85+11.7*i/nx;d=abs(x-river(y));z=h(x,y)
  if d<width(y):z=.26+.014*sin(x*4+y*8)
  elif d<width(y)+.22:z=.27+(h(x,y)-.27)*(d-width(y))/.22
  vs.append((x,y,z))
for j in range(ny):
 for i in range(nx):
  k=j*(nx+1)+i;fs.append((k,k+1,k+nx+2,k+nx+1))
terrain=objmesh('连通地形 · 溪床下切',vs,fs,soil);smooth(terrain)
sol=terrain.modifiers.new('土层厚度','SOLIDIFY');sol.thickness=.12
# Winding water, slightly irregular edge, volume thickness.
vs=[];fs=[]
for j in range(181):
 y=-4.96+9.92*j/180;xc=river(y);w=width(y)+.035
 for i in range(9):vs.append((xc-w+2*w*i/8,y,.355+.004*sin(y*8+i*.8)))
for j in range(180):
 for i in range(8):
  k=j*9+i;fs.append((k,k+1,k+10,k+9))
water=objmesh('蜿蜒溪水 · 有厚度水体',vs,fs,watermat);smooth(water);sol=water.modifiers.new('水深','SOLIDIFY');sol.thickness=.07

collection('02 · 砖木瓦屋')
# x house -4 to1.3; y .1 to3.65. Front towards negative Y.
x0,x1=-4.0,1.3;y0,y1=.1,3.65;ym=(y0+y1)/2;z0=.52;eave=3.65;ridge=5.15
profile=[(y0,z0),(y1,z0),(y1,eave),(ym,ridge),(y0,eave)]
vs=[(x,y,z) for x in (x0,x1) for y,z in profile];fs=[(0,4,3,2,1),(5,6,7,8,9)]
for i in range(5):j=(i+1)%5;fs.append((i,j,j+5,i+5))
house=objmesh('石灰墙体 · 山墙一体',vs,fs,plaster)
cutcol=bpy.data.collections.new('建筑开口 · 非渲染布尔控制');scene.collection.children.link(cutcol)
def cut(name,p,s):
 ob=box(name,p,s,None,0);COL.objects.unlink(ob);cutcol.objects.link(ob);ob.hide_render=True;ob.hide_set(True);ob.display_type='WIRE'
 md=house.modifiers.new(name,'BOOLEAN');md.operation='DIFFERENCE';md.object=ob
 return ob
cut('室内真实空间',(-1.35,1.875,2.15),(4.85,3.10,3.25))
cut('大门开口',(-1.25,.1,1.7),(1.35,.8,2.37))
for x in (-3.1,.3):cut('格窗开口',(x,.1,2.2),(.8,.8,1.25))
cut('侧窗开口',(-4,2.25,2.25),(.7,.85,1.1))
bevel(house,.025,2)
box('室内地面',(-1.35,1.85,.54),(4.86,3.1,.11),wood,.01)
# Roof sweep continuous shell, custom profile (eaves flatten gently).
def roofz(t):return ridge-1.48*t+.22*t*t
for side in (-1,1):
 vs=[];fs=[]
 for i in range(41):
  t=i/40
  for x in (x0-.32,x1+.32):vs.append((x,ym+side*2.14*t,roofz(t)))
 for i in range(40):fs.append((i*2,i*2+1,i*2+3,i*2+2) if side>0 else (i*2+2,i*2+3,i*2+1,i*2))
 roof=objmesh('承瓦木基层 '+str(side),vs,fs,wood);sol=roof.modifiers.new('屋面厚度','SOLIDIFY');sol.thickness=.09
 for x in (x0-.32,x1+.32):curve('山面封檐板',[(x,ym+side*2.14*t,roofz(t)-.04) for t in [0,.25,.5,.75,1]],.065,wood)
 rod('檐口横梁',(x0-.33,ym+side*2.14,roofz(1)-.07),(x1+.33,ym+side*2.14,roofz(1)-.07),.09,wood)
# Main ridge, also semantically readable at blockout.
rod('屋脊芯',(x0-.35,ym,ridge+.07),(x1+.35,ym,ridge+.07),.115,tile)
# Door portal framing and sill
for x in (-1.96,-.54):box('门框立柱',(x,-.025,1.7),(.105,.16,2.4),wood)
box('门楣',(-1.25,-.03,2.925),(1.59,.17,.15),wood)
box('门槛',(-1.25,-.02,.57),(1.53,.24,.12),stone)
# Roof canopy over front door
awning=box('门檐木盖',(-1.4,-.27,3.1),(2.7,.8,.08),wood,.015);awning.rotation_euler[0]=.2
for x in (-2.6,-.2):rod('门檐斜撑',(x,.00,2.53),(x,-.55,3.04),.045,wood)
# Steps, native array with exact rise and run.
step=box('入户石阶',(-1.3,-1.02,.40),(2.65,.39,.20),stone,.028)
arr=step.modifiers.new('三级石阶','ARRAY');arr.count=3;arr.use_relative_offset=False;arr.use_constant_offset=True;arr.constant_offset_displace=(0,.34,.13)

collection('03 · 瓜架')
for x in (-5.08,-2.9):
 for y in (-2.32,-.15):rod('竹架立柱',(x,y,.40),(x,y,2.87),.075,woodLight)
for y in (-2.32,-.15):rod('承重横梁',(-5.21,y,2.87),(-2.72,y,2.87),.072,woodLight)
for x in (-5.08,-2.9):rod('纵向梁',(x,-2.48,2.88),(x,.03,2.88),.07,woodLight)
# Native Array bamboo rafters
r=rod('瓜架平行格条',(-5.18,-2.4,2.94),(-2.8,-2.4,2.94),.029,woodLight)
a=r.modifiers.new('六道横格','ARRAY');a.count=7;a.use_relative_offset=False;a.use_constant_offset=True
# constant offset local to rotated beam: local Y is world Y here
worldoff=Vector((0,.40,0));a.constant_offset_displace=r.rotation_euler.to_matrix().inverted()@worldoff
r=rod('瓜架纵格',(-5.08,-2.48,3.00),(-5.08,.04,3.00),.026,woodLight)
a=r.modifiers.new('六道纵格','ARRAY');a.count=7;a.use_relative_offset=False;a.use_constant_offset=True;a.constant_offset_displace=r.rotation_euler.to_matrix().inverted()@Vector((.36,0,0))

collection('04 · 石拱桥')
by=-1.7;bx=river(by);br=1.13;brh=.68
# Radial ashlar wedge profile, flattened arch, separate true voussoirs.
for j in range(13):
 a=pi*j/13+.007;b=pi*(j+1)/13-.007
 for row in range(3):
  ya=by-.59+row*.395;yb=ya+.383
  points=[(bx+br*cos(a),brh*sin(a)+.36),(bx+br*cos(b),brh*sin(b)+.36),(bx+(br+.23)*cos(b),(brh+.23)*sin(b)+.36),(bx+(br+.23)*cos(a),(brh+.23)*sin(a)+.36)]
  vs=[(x,y,z) for y in (ya,yb) for x,z in points];ob=objmesh('拱券石_%02d_%d'%(j,row),vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],stoneLight);bevel(ob,.016,2)
for s in (-1,1):
 for y in (by-.49,by,by+.49):box('桥台踏步',(bx+s*1.28,y,.43),(.52,.47,.23),stoneLight,.035)
# Tree proxies and bamboo silhouettes for camera inspection.
collection('05 · 榆树与竹林')
if BLOCK:
 curve('树干',[(3.3,.8,.45),(3.15,.8,1.5),(3.4,.9,2.7),(3.3,.9,4)],.25,bark,[1.2,1,.7,.3])
 for p,s in [((3.6,.8,4.45),(1.65,1.22,1.05)),((2.5,1.0,4.2),(1.15,.96,.8)),((4.35,1.1,4.05),(1.1,.92,.8))]:uvball('树冠代理',p,s,leafm[2])
 for x,y in [(-5.25,1),(-5.1,2.5),(-3.3,4.4),(-1.7,4.5),(.3,4.3)]:
  rod('竹秆代理',(x,y,.45),(x+.2,y,5.5),.035,bamboo);uvball('竹叶代理',(x,y,4.5),(.6,.55,1.15),leafm[1])

collection('99 · 摄影棚')
studiomat=mat('暖灰无缝背景',(.59,.575,.54),.85)
box('摄影台地面',(0,0,-.32),(200,200,.10),studiomat,0)
world=bpy.data.worlds.new('柔和天空 · 无HDRI');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.69,.76,.85,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.32;scene.world=world
ld=bpy.data.lights.new('西南暖阳','AREA');ld.energy=2450;ld.shape='DISK';ld.size=3.5;ld.color=(1,.86,.65)
light=bpy.data.objects.new('西南暖阳',ld);COL.objects.link(light);light.location=(-5,-4,10);light.rotation_euler=(Vector((0,0,1.3))-light.location).to_track_quat('-Z','Y').to_euler()
ld=bpy.data.lights.new('天空柔光','AREA');ld.energy=550;ld.size=7;ld.color=(.68,.78,1)
light=bpy.data.objects.new('天空柔光',ld);COL.objects.link(light);light.location=(4,3,9);light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('参考三分之四视角');cam=bpy.data.objects.new('参考三分之四视角',cd);COL.objects.link(cam)
cam.location=(-13.8,-15,12.4);target=Vector((0,0,1.95));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=16.0;cd.lens=48;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32 if BLOCK else 64
scene.cycles.use_denoising=True;scene.cycles.max_bounces=8;scene.cycles.transparent_max_bounces=8
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
 prefs.compute_device_type='METAL';prefs.get_devices()
 for d in prefs.devices:d.use=d.type=='METAL'
 scene.cycles.device='GPU'
except Exception as e:print('GPU fallback',e)
scene.render.resolution_x=1440;scene.render.resolution_y=1100;scene.render.resolution_percentage=65 if BLOCK else 80
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.15
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
if BLOCK:
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'verification/blockout.blend'))
 scene.render.filepath=str(ROOT/'verification/blockout.png');bpy.ops.render.render(write_still=True)
else:
 exec(compile((ROOT/'source/details.py').read_text(),'details.py','exec'))
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
 scene.render.filepath=str(ROOT/'verification/first_full.png');bpy.ops.render.render(write_still=True)
