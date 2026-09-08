import bpy, math, json, numpy as np
from pathlib import Path
from collections import defaultdict
ROOT=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=scene
# Evaluate into a separate export scene. Original .blend on disk retains native systems.
# Reduce only surplus subdivisions in tiny repeated leaves for the browser copy.
for ob in bpy.data.collections['植物几何源 · 仅供实例'].objects:
 if ob.type=='MESH' and any(w in ob.name for w in ['榆叶','披针竹叶','草叶','花瓣']):
  dec=ob.modifiers.new('实时预览叶面简化','DECIMATE');dec.ratio=.60
original=[o for o in scene.objects if o.type in ('MESH','CURVE') and not o.hide_render and not o.hide_get() and not any(c.name.startswith('99') for c in o.users_collection)]
for ob in original:
 for mod in ob.modifiers:
  if mod.type=='NODES' and mod.node_group:
   ng=mod.node_group.copy();mod.node_group=ng;out=next((n for n in ng.nodes if n.type=='GROUP_OUTPUT'),None)
   if out and out.inputs[0].is_linked:
    link=out.inputs[0].links[0];src=link.from_socket;ng.links.remove(link);real=ng.nodes.new('GeometryNodeRealizeInstances');ng.links.new(src,real.inputs[0]);ng.links.new(real.outputs[0],out.inputs[0])
bpy.context.view_layer.update();dp=bpy.context.evaluated_depsgraph_get()
exportcol=bpy.data.collections.new('可旋转预览 · 实体几何');scene.collection.children.link(exportcol)
new=[];groups=defaultdict(list);audit={'invalid_positions':[],'invalid_normals':[],'zero_normals':[],'objects':len(original),'external_images':[],'thin_sheets':['leaves','flower petals','grass'],'note':'水为有厚度曲面；房屋Boolean保持在原始blend；导出副本展开实例并使用自制便携纹理。'}
for k,ob in enumerate(original):
 ev=ob.evaluated_get(dp)
 try:me=bpy.data.meshes.new_from_object(ev,preserve_all_data_layers=True,depsgraph=dp)
 except Exception as e:print('SKIP',ob.name,e,flush=True);continue
 if not len(me.vertices):bpy.data.meshes.remove(me);continue
 coords=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',coords)
 normals=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('normal',normals)
 if not np.isfinite(coords).all():audit['invalid_positions'].append(ob.name)
 if not np.isfinite(normals).all():audit['invalid_normals'].append(ob.name)
 if np.any(np.linalg.norm(normals.reshape(-1,3),axis=1)<.01):audit['zero_normals'].append(ob.name)
 no=bpy.data.objects.new(ob.name,me);exportcol.objects.link(no);no.matrix_world=ob.matrix_world.copy();new.append(no)
 # Portable material UVs follow each original component before world-space joining.
 uv=me.uv_layers.new(name='ProceduralSurfaceUV')
 for poly in me.polygons:
  axis=max(range(3),key=lambda i:abs(poly.normal[i]))
  for li in poly.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co
   uv.data[li].uv=(v[1],v[2]) if axis==0 else ((v[0],v[2]) if axis==1 else (v[0],v[1]))
 sem=ob.users_collection[0].name.split(' · ')[0]
 mats=tuple(m.name if m else '' for m in me.materials)
 groups[(sem,mats)].append(no)
 if k%300==0:print('evaluated',k,flush=True)
for ob in original:ob.hide_set(True);ob.hide_render=True
# Group compatible independent components; preserves construction boundaries in original project.
for key,obs in groups.items():
 if len(obs)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for ob in obs:ob.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=key[0]+' · '+(key[1][0] if key[1] else 'Geometry')
print('EXPORT GROUPS',len(exportcol.objects),flush=True)
# Authored portable texture fields, never downloaded images. Native shader materials remain in .blend.
used={m for ob in exportcol.objects for m in ob.data.materials if m}
texdir=ROOT/'preview/procedural-textures';texdir.mkdir(exist_ok=True)
rng=np.random.default_rng(908);N=512
Y,X=np.mgrid[0:N,0:N]/N

def noise(fx,fy):
 grid=rng.random((fy+1,fx+1));px=X*fx;py=Y*fy;ix=np.floor(px).astype(int);iy=np.floor(py).astype(int);tx=px-ix;ty=py-iy;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty)
 return (grid[iy,ix]*(1-tx)+grid[iy,ix+1]*tx)*(1-ty)+(grid[iy+1,ix]*(1-tx)+grid[iy+1,ix+1]*tx)*ty
basefield=sum(noise(f,f)*w for f,w in [(3,.32),(9,.27),(25,.21),(80,.13),(200,.07)])
woodfield=.62*noise(85,3)+.25*noise(150,8)+.13*noise(300,40)
for idx,ma in enumerate(used):
 old=ma.node_tree.nodes.get('Principled BSDF') if ma.use_nodes else None
 rough=float(old.inputs['Roughness'].default_value) if old else .7
 trans=float(old.inputs['Transmission Weight'].default_value) if old else 0
 color=tuple(ma.diffuse_color[:3]);ma.node_tree.nodes.clear();n=ma.node_tree.nodes;l=ma.node_tree.links;bs=n.new('ShaderNodeBsdfPrincipled');out=n.new('ShaderNodeOutputMaterial');l.new(bs.outputs[0],out.inputs[0]);bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 if trans:bs.inputs['Transmission Weight'].default_value=trans;bs.inputs['IOR'].default_value=1.333
 mapped=any(w in ma.name for w in ['石','灰泥','杉木','树皮','陶','土','木 ·','竹秆','筒瓦','磨损','浅棱'])
 if not mapped:continue
 field=woodfield if any(w in ma.name for w in ['木','竹秆','树皮']) else basefield
 mul=.55+field*.88;rgb=np.clip(np.array(color)[None,None,:]*mul[:,:,None],0,1);rgb=np.where(rgb<=.0031308,rgb*12.92,1.055*rgb**(1/2.4)-.055)
 pixels=np.ones((N,N,4),dtype=np.float32);pixels[:,:,:3]=rgb
 im=bpy.data.images.new('自制纹理 '+ma.name,width=N,height=N);im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(texdir/('%02d.png'%idx));im.file_format='PNG';im.save();im.pack()
 tex=n.new('ShaderNodeTexImage');tex.image=im;l.new(tex.outputs['Color'],bs.inputs['Base Color'])
# Selection is the complete dedicated export collection only.
bpy.ops.object.select_all(action='DESELECT')
for ob in exportcol.objects:ob.select_set(True)
audit['export_objects']=len(exportcol.objects);audit['vertices']=sum(len(o.data.vertices) for o in exportcol.objects);audit['faces']=sum(len(o.data.polygons) for o in exportcol.objects)
(ROOT/'verification/geometry-check.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'preview/竹溪小院.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=False,export_materials='EXPORT',export_image_format='AUTO',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_texcoord_quantization=16)
print('EXPORT_DONE',json.dumps(audit,ensure_ascii=False),flush=True)
