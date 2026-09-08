import bpy, math, json, numpy as np
from pathlib import Path
from collections import defaultdict
from mathutils import Matrix
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
def actor_root(ob):
 p=ob
 while p:
  if p.name=='母鸡' or p.name.startswith('小鸡 ') or p.name.startswith('溪鸭 '):
   if p.type=='EMPTY':return p
  p=p.parent
 return None

def semantics(ob):
 name=ob.name
 if name.startswith('榆树分层叶冠'):return 'wind_tree'
 if name.startswith(('竹叶飞簇','竹秆 ','竹枝','竹节环')):return 'wind_bamboo'
 if name.startswith(('一级分枝','二级细枝')):return 'wind_tree_branch'
 if name.startswith(('五瓣花簇','花境叶片','凤仙花茎','花心','溪岸花','溪岸黄')):return 'wind_flower'
 if name.startswith(('草丛高低层','树根莎草')):return 'wind_grass'
 if name.startswith(('掌叶攀覆','攀缘藤','棚上纵横')):return 'wind_vine'
 if '蜿蜒溪水' in name:return 'water_replace'
 if '鸭后涟漪' in name:return 'wake_replace'
 return ob.users_collection[0].name.split(' · ')[0]
actor_sources={}
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
 sem=semantics(ob)
 actor=actor_root(ob)
 aid=actor.name if actor else ''
 if actor:actor_sources[aid]=actor
 mats=tuple(m.name if m else '' for m in me.materials)
 groups[(sem,mats,aid)].append(no)
 if k%300==0:print('evaluated',k,flush=True)
for ob in original:ob.hide_set(True);ob.hide_render=True
# Group compatible independent components; preserves construction boundaries in original project.
for key,obs in groups.items():
 if len(obs)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for ob in obs:ob.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=key[0]+' · '+(key[1][0] if key[1] else 'Geometry')
 groups[key]=[obs[0]]
# Preserve each animal as its own local-coordinate assembly for anatomically weighted motion.
for aid,source in actor_sources.items():
 actor=bpy.data.objects.new('actor_'+('hen' if aid=='母鸡' else 'duck_'+aid.split()[-1] if aid.startswith('溪鸭') else 'chick_'+aid.split()[-1]),None)
 exportcol.objects.link(actor);actor.matrix_world=source.matrix_world.copy()
 for (sem,mats,keyaid),obs in groups.items():
  if keyaid!=aid:continue
  for ob in obs:
   local=source.matrix_world.inverted() @ ob.matrix_world;ob.data.transform(local);ob.matrix_world=Matrix.Identity(4);ob.parent=actor;ob.matrix_parent_inverse=Matrix.Identity(4);ob.matrix_basis=Matrix.Identity(4)
# World-space static fields make wind phases coherent across leaves and supporting stems.
for ob in exportcol.objects:
 if ob.type=='MESH' and ob.parent is None:
  ob.data.transform(ob.matrix_world);ob.matrix_world=Matrix.Identity(4)
print('EXPORT GROUPS',len(exportcol.objects),flush=True)
# Authored portable texture fields, never downloaded images. Native shader materials remain in .blend.
used={m for ob in exportcol.objects if ob.type=='MESH' for m in ob.data.materials if m}
texdir=ROOT/'preview/materials-v2';texdir.mkdir(exist_ok=True)
rng=np.random.default_rng(908);N=1024
Y,X=np.mgrid[0:N,0:N]/N

def noise(fx,fy):
 grid=rng.random((fy+1,fx+1));px=X*fx;py=Y*fy;ix=np.floor(px).astype(int);iy=np.floor(py).astype(int);tx=px-ix;ty=py-iy;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty)
 return (grid[iy,ix]*(1-tx)+grid[iy,ix+1]*tx)*(1-ty)+(grid[iy+1,ix]*(1-tx)+grid[iy+1,ix+1]*tx)*ty
basefield=sum(noise(f,f)*w for f,w in [(3,.32),(9,.27),(25,.21),(80,.13),(200,.07)])
woodfield=.62*noise(85,3)+.25*noise(150,8)+.13*noise(300,40)
for idx,ma in enumerate(sorted(used,key=lambda m:m.name)):
 old=ma.node_tree.nodes.get('Principled BSDF') if ma.use_nodes else None
 rough=float(old.inputs['Roughness'].default_value) if old else .7
 trans=float(old.inputs['Transmission Weight'].default_value) if old else 0
 vertex_color=next((x.layer_name for x in ma.node_tree.nodes if x.type=='VERTEX_COLOR'),None)
 color=tuple(ma.diffuse_color[:3]);ma.node_tree.nodes.clear();n=ma.node_tree.nodes;l=ma.node_tree.links;bs=n.new('ShaderNodeBsdfPrincipled');out=n.new('ShaderNodeOutputMaterial');l.new(bs.outputs[0],out.inputs[0]);bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 if vertex_color is not None:
  vc=n.new('ShaderNodeVertexColor');vc.layer_name=vertex_color;l.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if trans:bs.inputs['Transmission Weight'].default_value=trans;bs.inputs['IOR'].default_value=1.333
 mapped=any(w in ma.name for w in ['石','灰泥','杉木','树皮','陶','土','木 ·','竹秆','筒瓦','磨损','浅棱'])
 if not mapped:continue
 field=woodfield if any(w in ma.name for w in ['木','竹秆','树皮']) else basefield
 mul=.55+field*.88;rgb=np.clip(np.array(color)[None,None,:]*mul[:,:,None],0,1);rgb=np.where(rgb<=.0031308,rgb*12.92,1.055*rgb**(1/2.4)-.055)
 pixels=np.ones((N,N,4),dtype=np.float32);pixels[:,:,:3]=rgb
 im=bpy.data.images.new('自制纹理 '+ma.name,width=N,height=N);im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(texdir/('%02d.png'%idx));im.file_format='PNG';im.save();im.pack()
 tex=n.new('ShaderNodeTexImage');tex.image=im;l.new(tex.outputs['Color'],bs.inputs['Base Color'])
 # Companion normal and roughness channels retain pore/grain relief in glTF.
 height=field.copy()
 if '石' in ma.name:height=.66*basefield+.34*noise(220,220)
 elif '瓦' in ma.name:height=.78*basefield+.22*noise(350,350)
 dy,dx=np.gradient(height);strength=22 if '石' in ma.name else 13 if '瓦' in ma.name else 18
 normals=np.stack((-dx*strength,-dy*strength,np.ones_like(dx)),axis=-1);normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
 pix=np.ones((N,N,4),dtype=np.float32);pix[:,:,:3]=normals*.5+.5
 nim=bpy.data.images.new('自制法线 '+ma.name,width=N,height=N);nim.colorspace_settings.name='Non-Color';nim.pixels.foreach_set(pix.ravel());nim.filepath_raw=str(texdir/('%02d_normal.png'%idx));nim.file_format='PNG';nim.save();nim.pack();nt=n.new('ShaderNodeTexImage');nt.image=nim;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;l.new(nt.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs[0],bs.inputs['Normal'])
 roughfield=np.clip(rough-.18+basefield*.32, .18,.99);pix[:,:,:3]=roughfield[:,:,None]
 rim=bpy.data.images.new('自制粗糙度 '+ma.name,width=N,height=N);rim.colorspace_settings.name='Non-Color';rim.pixels.foreach_set(pix.ravel());rim.filepath_raw=str(texdir/('%02d_rough.png'%idx));rim.file_format='PNG';rim.save();rim.pack();rt=n.new('ShaderNodeTexImage');rt.image=rim;l.new(rt.outputs['Color'],bs.inputs['Roughness'])
# Selection is the complete dedicated export collection only.
bpy.ops.object.select_all(action='DESELECT')
for ob in exportcol.objects:ob.select_set(True)
audit['export_objects']=len(exportcol.objects);audit['vertices']=sum(len(o.data.vertices) for o in exportcol.objects if o.type=='MESH');audit['faces']=sum(len(o.data.polygons) for o in exportcol.objects if o.type=='MESH')
(ROOT/'verification/光影动态优化/geometry-check.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'preview/竹溪小院_动态.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=False,export_materials='EXPORT',export_image_format='AUTO',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_texcoord_quantization=16)
print('EXPORT_DONE',json.dumps(audit,ensure_ascii=False),flush=True)
