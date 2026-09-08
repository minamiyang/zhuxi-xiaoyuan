import bpy,ast,random,math,json
from mathutils import Vector
from math import sin,cos,pi,sqrt
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=scene
COL=bpy.data.collections['05 · 榆树与竹林']
for filename,funcnames in [('build_scene.py',{'objmesh','curve'}),('details.py',{'instances'})]:
 tree=ast.parse((ROOT/'source'/filename).read_text());defs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in funcnames];exec(compile(ast.Module(body=defs,type_ignores=[]),filename,'exec'))
for ob in list(scene.objects):
 if ob.name.startswith(('主干 · 起伏收径','盘根','树皮纵向沟脊','一级分枝','二级细枝','榆树分层叶冠')):bpy.data.objects.remove(ob,do_unlink=True)
bark=bpy.data.materials['老树树皮'];woodLight=bpy.data.materials['竹木 · 蜜色旧表皮'];leafm=[bpy.data.materials['叶色%02d'%i] for i in range(6)];leafsrc=[bpy.data.objects['榆叶原型 '+str(i)] for i in range(6)]
src=(ROOT/'source/details.py').read_text();section=src[src.index('random.seed(403)'):src.index('# Bamboo, actual nodes')]
# A single affine reshaping preserves the original rounded crown silhouette.
# Keep the root/trunk in place, let the branches grow toward the unobstructed side.
# Original seeded cloud x range: 1.01215..5.60280; map to 2.07..5.60280.
sx=.7695642285206908;ox=1.2910844418341234
section=section.replace(" mid=start.lerp(end,.53)",f" end.x=end.x*{sx}+{ox}\n mid=start.lerp(end,.53)")
section=section.replace('random.uniform(.20,.65)*cos(a2)',f'random.uniform(.20,.65)*cos(a2)*{sx}')
section=section.replace('(.62*rr*sqrt(1-ct*ct)*cos(theta)',f'(.62*{sx}*rr*sqrt(1-ct*ct)*cos(theta)')
exec(compile(section,'natural-tree-sprays','exec'))
scene['roof_tree_clearance_revision']='Whole-crown affine reshaping preserves original rounded silhouette, 24800 leaves, no plane cut.'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
print('NATURAL_CROWN_RESTORED',sum(len(o.data.vertices) for o in scene.objects if o.name.startswith('榆树分层叶冠')),flush=True)
