import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=s
bpy.data.objects['完整展示底座'].location.z=-.09
bpy.data.objects['摄影台地面'].location.z=-.47
bpy.data.objects['连通地形 · 溪床下切'].modifiers['土层厚度'].thickness=.24
for ma in bpy.data.materials:
 factor=.34 if '筒瓦' in ma.name else .40 if '瓦口磨损' in ma.name else .64 if ma.name.startswith('叶色') else .71 if '竹秆 ·' in ma.name else 1
 if factor==1:continue
 ma.diffuse_color=(*(c*factor for c in ma.diffuse_color[:3]),1)
 n=ma.node_tree.nodes;bs=n.get('Principled BSDF')
 if bs:bs.inputs['Base Color'].default_value=(*(c*factor for c in bs.inputs['Base Color'].default_value[:3]),1)
 for node in n:
  if node.type=='VALTORGB':
   for el in node.color_ramp.elements:el.color=(*(c*factor for c in el.color[:3]),1)
# Ground should read as natural soil, with modest fine grain rather than a smooth slab.
soil=bpy.data.materials['压实院土 · 土粒'];bs=soil.node_tree.nodes.get('Principled BSDF')
for node in soil.node_tree.nodes:
 if node.type=='BUMP':node.inputs['Distance'].default_value=.04;node.inputs['Strength'].default_value=.45
p=bpy.context.preferences.addons['cycles'].preferences
p.compute_device_type='METAL';p.get_devices()
for d in p.devices:d.use=d.type=='METAL'
s.cycles.device='GPU';s.cycles.samples=72
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
s.render.filepath=str(ROOT/'verification/refined_light_water.png');bpy.ops.render.render(write_still=True)
