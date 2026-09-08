import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
s=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=s
# Physically distinct mineral substrates; darker stone body, chalky clay and directional wood.
for ma in bpy.data.materials:
 if '桥石' in ma.name:base=(.265,.27,.225);rough=.81
 elif '砂岩' in ma.name:base=(.20,.218,.175);rough=.88
 elif '筒瓦' in ma.name:base=(.072,.083,.081);rough=.80
 elif '瓦口磨损' in ma.name:base=(.098,.107,.10);rough=.88
 else:continue
 ma.diffuse_color=(*base,1);n=ma.node_tree.nodes;l=ma.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough
 for no in n:
  if no.type=='VALTORGB':
   no.color_ramp.elements[0].position=.16;no.color_ramp.elements[0].color=(*(v*.58 for v in base),1);no.color_ramp.elements[1].position=.82;no.color_ramp.elements[1].color=(*(v*1.65 for v in base),1)
  if no.type=='BUMP':no.inputs['Strength'].default_value=.43;no.inputs['Distance'].default_value=.027 if '石' in ma.name else .011
 # Coarse grain acts independently of fine pores, with weathering in damp low areas.
 geo=n.new('ShaderNodeNewGeometry');sep=n.new('ShaderNodeSeparateXYZ');l.new(geo.outputs['Position'],sep.inputs[0]);nr=n.new('ShaderNodeTexNoise');nr.inputs['Scale'].default_value=17;nr.inputs['Detail'].default_value=5;l.new(geo.outputs['Position'],nr.inputs['Vector'])
 old=bs.inputs['Normal'].links[0].from_socket if bs.inputs['Normal'].is_linked else None
 bm=n.new('ShaderNodeBump');bm.inputs['Strength'].default_value=.32;bm.inputs['Distance'].default_value=.011;l.new(nr.outputs['Fac'],bm.inputs['Height'])
 if old:l.new(old,bm.inputs['Normal'])
 l.new(bm.outputs['Normal'],bs.inputs['Normal'])
 if '桥石' in ma.name or '砂岩' in ma.name:
  height=n.new('ShaderNodeMapRange');height.clamp=True;height.inputs['From Min'].default_value=.35;height.inputs['From Max'].default_value=.95;height.inputs['To Min'].default_value=.66;height.inputs['To Max'].default_value=0;l.new(sep.outputs['Z'],height.inputs[0]);mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';l.new(height.outputs[0],mul.inputs[0]);l.new(nr.outputs['Fac'],mul.inputs[1]);mix=n.new('ShaderNodeMixRGB');l.new(mul.outputs[0],mix.inputs[0]);l.new(bs.inputs['Base Color'].links[0].from_socket,mix.inputs[1]);mix.inputs[2].default_value=(.07,.093,.043,1);l.new(mix.outputs[0],bs.inputs['Base Color'])
# Small per-stone physical edge irregularities, keeping the load-bearing wedge geometry.
tex=bpy.data.textures.new('桥石细碎风化',type='CLOUDS');tex.noise_scale=.085;tex.noise_depth=2
for ob in s.objects:
 if ob.name.startswith('拱券石'):
  su=ob.modifiers.new('风化细分','SUBSURF');su.subdivision_type='SIMPLE';su.levels=2;su.render_levels=2
  dis=ob.modifiers.new('浅层自然崩蚀','DISPLACE');dis.texture=tex;dis.strength=.007;dis.mid_level=.5;dis.texture_coords='GLOBAL'
# Water uses low absorption, wavelength-separated micro normals and true Cycles transmission.
ma=bpy.data.materials['溪水 · 透射与水面微波'];n=ma.node_tree.nodes;l=ma.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.65,.79,.66,1);bs.inputs['Roughness'].default_value=.075;bs.inputs['Transmission Weight'].default_value=1;bs.inputs['IOR'].default_value=1.333
for no in n:
 if no.type=='BUMP':no.inputs['Strength'].default_value=.23;no.inputs['Distance'].default_value=.022
vol=n.new('ShaderNodeVolumeAbsorption');vol.inputs['Color'].default_value=(.34,.49,.24,1);vol.inputs['Density'].default_value=.6;l.new(vol.outputs[0],n.get('Material Output').inputs['Volume'])
# One warm solar key, cool sky fill and warm soil bounce; the key alone casts defined soft shadows.
for ob in s.objects:
 if ob.type=='LIGHT':ob.hide_render=True
col=s.collection
ld=bpy.data.lights.new('午後斜阳 · 主光','SUN');ld.energy=2.15;ld.angle=.09;ld.color=(1,.86,.66);ob=bpy.data.objects.new('午後斜阳 · 主光',ld);col.objects.link(ob);ob.rotation_euler=Vector((5,4,-8)).to_track_quat('-Z','Y').to_euler()
ld=bpy.data.lights.new('天空大面柔光','AREA');ld.energy=420;ld.shape='DISK';ld.size=8;ld.color=(.67,.78,1);ob=bpy.data.objects.new('天空大面柔光',ld);col.objects.link(ob);ob.location=(3,4,9);ob.rotation_euler=(Vector((0,0,1))-ob.location).to_track_quat('-Z','Y').to_euler()
ld=bpy.data.lights.new('院土暖反照','AREA');ld.energy=65;ld.size=5;ld.color=(1,.79,.49);ob=bpy.data.objects.new('院土暖反照',ld);col.objects.link(ob);ob.location=(-2,-4,2);ob.rotation_euler=(Vector((0,0,2))-ob.location).to_track_quat('-Z','Y').to_euler()
s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.64,.76,1,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.19
s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=.2
s.camera.data.dof.use_dof=False
p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
for d in p.devices:d.use=d.type=='METAL'
s.cycles.device='GPU';s.cycles.samples=96
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
s.render.resolution_percentage=55;s.render.filepath=str(ROOT/'verification/光影动态优化/native_lighting_v2.png');bpy.ops.render.render(write_still=True)
