import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=s
old=bpy.data.objects.get('母鸡')
if old:
 for ob in list(old.children_recursive)+[old]:bpy.data.objects.remove(ob,do_unlink=True)
before=set(s.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'preview/母鸡_重建.glb'))
added=set(s.objects)-before
for ob in added:
 if ob.parent is None:ob.name='母鸡'
 for c in list(ob.users_collection):c.objects.unlink(ob)
 bpy.data.collections['09 · 母鸡、小鸡与溪鸭'].objects.link(ob)
 if ob.type=='MESH':
  for poly in ob.data.polygons:poly.use_smooth=True
ma=bpy.data.materials['溪水 · 透射与水面微波'];n=ma.node_tree.nodes;bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.86,.94,.87,1);bs.inputs['Roughness'].default_value=.06
for no in n:
 if no.type=='VOLUME_ABSORPTION':no.inputs['Density'].default_value=.12
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
print('NATIVE_HEN_UPDATED',flush=True)
