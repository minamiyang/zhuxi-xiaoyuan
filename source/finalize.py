import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes['竹溪小院 · 午后有风'];bpy.context.window.scene=scene
cam=scene.camera
# Runtime capability and actual evaluated-geometry audit.
prefs=bpy.context.preferences.addons['cycles'].preferences
try:
 prefs.compute_device_type='METAL';prefs.get_devices()
 for d in prefs.devices:d.use=d.type=='METAL'
 scene.cycles.device='GPU'
except Exception:scene.cycles.device='CPU'
scene.cycles.use_denoising=True;scene.cycles.samples=128;scene.cycles.adaptive_threshold=.012;scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8
scene.render.resolution_percentage=100;scene.render.resolution_x=2560;scene.render.resolution_y=1956
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.color_depth='8'
# Canonical project opens to the modeled scene and its camera.
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_perspective='CAMERA'
scene.render.filepath=str(ROOT/'renders/竹溪小院_主视角.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'竹溪小院.blend'))
bpy.ops.render.render(write_still=True)
print('HERO_COMPLETE',flush=True)
# Two purposeful details and one reverse-side geometry check.
shots=[('竹溪小院_瓜架近景',(-10,-12,8),(-2.7,-.4,1.65),7.6),('竹溪小院_溪桥近景',(-.5,-10.5,7),(3.1,-1.4,1.7),7.3),('背面结构检查',(11,13,10),(0,0,1.7),16)]
scene.render.resolution_x=1600;scene.render.resolution_y=1250;scene.cycles.samples=96
for name,pos,target,scale in shots:
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
 scene.render.filepath=str(ROOT/('verification' if name=='背面结构检查' else 'renders')/(name+'.png'));bpy.ops.render.render(write_still=True);print(name+' COMPLETE',flush=True)
