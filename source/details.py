# All forms in this file are authored procedural geometry, with no external assets.
collection('02A · 层叠筒瓦与屋脊')
# Individual curved cross-section roof tiles; each course owns a native Array.
for side in (-1,1):
 for row in range(17):
  t0=row/17;t1=min(1.025,(row+1.24)/17);vs=[];fs=[]
  for k in range(4):
   t=t0+(t1-t0)*k/3
   for j in range(11):
    a=pi*j/10;xx=.077*cos(a);zz=.049*sin(a)
    vs.append((xx,side*2.14*(t-t0),roofz(t)-roofz(t0)+zz+.025+(.007 if row%2 else 0)))
  for k in range(3):
   for j in range(10):q=k*11+j;fs.append((q,q+1,q+12,q+11) if side<0 else (q+11,q+12,q+1,q))
  ob=objmesh('筒瓦_%s_%02d'%(side,row),vs,fs,tile if row%3 else tileedge);ob.location=(x0-.245,ym+side*2.14*t0,roofz(t0));smooth(ob)
  so=ob.modifiers.new('陶瓦厚度','SOLIDIFY');so.thickness=.014
  ar=ob.modifiers.new('整排瓦片','ARRAY');ar.count=37;ar.use_relative_offset=False;ar.use_constant_offset=True;ar.constant_offset_displace=(.159,0,0)
# Ridge semi-round caps axis X
vs=[];fs=[]
for x in (-.105,.105):
 for j in range(13):a=pi*j/12;vs.append((x,.13*cos(a),.13*sin(a)))
for j in range(12):fs.append((j,j+1,j+14,j+13))
ob=objmesh('屋脊搭接帽瓦',vs,fs,tileedge);ob.location=(x0-.24,ym,ridge+.055);smooth(ob);so=ob.modifiers.new('脊瓦厚度','SOLIDIFY');so.thickness=.027
ar=ob.modifiers.new('二十八枚脊瓦','ARRAY');ar.count=28;ar.use_relative_offset=False;ar.use_constant_offset=True;ar.constant_offset_displace=(.21,0,0)
for x in (x0-.34,x1+.34):
 box('脊端收头',(x,ym,ridge+.12),(.18,.32,.27),tile,.045)
 uvball('脊端圆弧',(x,ym,ridge+.26),(.10,.15,.07),tileedge)
# exposed rafter ends regular array
r=rod('木椽端头',(x0-.17,-.19,3.84),(x0-.17,.2,4.00),.04,woodLight)
ar=r.modifiers.new('檐下椽列','ARRAY');ar.count=22;ar.use_relative_offset=False;ar.use_constant_offset=True;ar.constant_offset_displace=r.rotation_euler.to_matrix().inverted()@Vector((.25,0,0))

collection('02B · 门窗细木作与墙脚')
# glazing represented by real opening and inner wooden lattices, no opaque black plate.
for x in (-3.1,.3):
 for xx in (x-.43,x+.43):box('窗边框',(xx,-.027,2.20),(.085,.14,1.40),wood,.013)
 for z in (1.52,2.88):box('窗横框',(x,-.027,z),(.92,.15,.075),wood,.012)
 rail=box('窗竖棂',(x-.34,-.015,2.20),(.030,.065,1.24),wood,.006)
 ar=rail.modifiers.new('八根窗棂','ARRAY');ar.count=8;ar.use_relative_offset=False;ar.use_constant_offset=True;ar.constant_offset_displace=(.096,0,0)
 for z in (1.82,2.22,2.60):box('格窗横档',(x,-.041,z),(.8,.069,.032),wood,.005)
 box('石质窗台',(x,-.061,1.47),(1.01,.29,.10),stoneLight,.028)
# side window
for y in (1.78,2.72):box('侧窗边框',(-4.04,y,2.25),(.13,.09,1.25),wood,.015)
for z in (1.64,2.86):box('侧窗横框',(-4.05,2.25,z),(.14,1,.08),wood,.014)
r=box('侧窗细棂',(-4.04,1.88,2.25),(.07,.028,1.1),wood,.005);ar=r.modifiers.new('侧窗七棂','ARRAY');ar.count=8;ar.use_relative_offset=False;ar.use_constant_offset=True;ar.constant_offset_displace=(0,.106,0)
# Two open lattice-panel doors, leaf dimensions .62 x2.25; rotation about real hinge.
for side in (-1,1):
 hinge=bpy.data.objects.new('门扇铰轴',None);COL.objects.link(hinge);hinge.location=(-1.25+side*.64,-.065,.60);hinge.rotation_euler[2]=side*math.radians(22 if side==-1 else 43)
 def doorpart(name,p,s,ma):
  ob=box(name,p,s,ma,.009);ob.parent=hinge;return ob
 cx=-side*.30
 for xx in (0,-side*.61):doorpart('门梃',(xx,0,1.10),(.065,.09,2.24),wood)
 for zz in (.035,.90,2.19):doorpart('门档',(cx,0,zz),(.63,.10,.07),wood)
 for i in range(5):doorpart('下段门板',(-side*(.075+i*.11),.0,.46),(.104,.060,.83),wood)
 for i in range(7):doorpart('透空门棂',(-side*(.072+i*.077),0,1.55),(.025,.055,1.19),wood)
 for zz in (1.05,1.2,1.9,2.07):doorpart('格心横条',(cx,-.005,zz),(.59,.06,.026),wood)
 # bronze ring pull using torus
 bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=(-side*.48,-.065,.96),major_radius=.039,minor_radius=.008,rotation=(pi/2,0,0))
 ob=move_col(bpy.context.object);ob.name='青铜门环';ob.parent=hinge;ob.data.materials.append(mat('暗铜门环 '+str(side),(.17,.115,.047),.36))
# Fine lintel and awning seams
for i in range(13):
 ob=box('门檐拼板',(-2.61+i*.205,-.29,3.158),(.195,.81,.03),tile,.009);ob.rotation_euler[0]=.2
# foundation stones, varied but horizontal bed joints
for row in range(2):
 for j in range(11):
  x=-3.83+j*.49
  if abs(x+1.25)<.78:continue
  box('墙脚前砌石',(x,.017,.62+row*.21),(.474,.26,.20),stone,.025)
 for j in range(8):box('墙脚侧砌石',(-4.017,.31+j*.44,.62+row*.21),(.26,.427,.20),stone,.026)
# plaster patina: geometry-position mask makes damp/chips accumulate near ground and corners.
n=plaster.node_tree.nodes;l=plaster.node_tree.links;bs=n.get('Principled BSDF');old=bs.inputs['Base Color'].links[0].from_socket
geo=n.new('ShaderNodeNewGeometry');sep=n.new('ShaderNodeSeparateXYZ');l.new(geo.outputs['Position'],sep.inputs[0])
height=n.new('ShaderNodeMapRange');height.inputs['From Min'].default_value=.63;height.inputs['From Max'].default_value=2.0;height.inputs['To Min'].default_value=.8;height.inputs['To Max'].default_value=0;l.new(sep.outputs['Z'],height.inputs['Value'])
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=12;noise.inputs['Detail'].default_value=3;l.new(geo.outputs['Position'],noise.inputs['Vector'])
mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';l.new(height.outputs[0],mul.inputs[0]);l.new(noise.outputs['Fac'],mul.inputs[1])
mix=n.new('ShaderNodeMixRGB');l.new(mul.outputs[0],mix.inputs[0]);l.new(old,mix.inputs[1]);mix.inputs[2].default_value=(.30,.25,.135,1);l.new(mix.outputs[0],bs.inputs['Base Color'])
# Local worn/chipped lime edges using thin irregular actual patches, supported on exterior.
chipmat=mat('灰泥脱落露土',(.44,.35,.21),.94,'plaster')
random.seed(83)
for side in ('front','left'):
 for i in range(115):
  z=random.uniform(.79,3.49);u=random.uniform(-3.93,1.23) if side=='front' else random.uniform(.12,3.61)
  if side=='front' and ((abs(u+1.25)<.77 and z<2.99) or any(abs(u-x)<.5 and 1.4<z<2.99 for x in (-3.1,.3))):continue
  if side=='left' and 1.7<u<2.8 and 1.57<z<2.92:continue
  if random.random()>(.76 if z<1.2 else .23):continue
  rx=random.uniform(.018,.067);rz=rx*random.uniform(1,3);vs=[]
  for j in range(9):
   a=j*2*pi/9;r=random.uniform(.6,1)
   vs.append((u+rx*cos(a)*r,.097,z+rz*sin(a)*r) if side=='front' else (-4.002,u+rx*cos(a)*r,z+rz*sin(a)*r))
  objmesh('灰泥不规则风化',vs,[tuple(range(9))],chipmat)
# Inside: tabletop, two stools and a shelf visible through open portal.
for x in (-2.35,-.7):box('室内凳面',(x,1.25,.97),(.45,.43,.08),wood)
box('室内木桌',(-1.45,2.25,1.31),(1.45,.73,.10),wood)
for x in (-2.02,-.88):
 for y in (2,2.5):box('室内桌腿',(x,y,.93),(.075,.075,.70),wood)

# Helpers for plant field: leaf source is a folded, curved manifold-like thin sheet.
collection('06 · 自制植物源与分布')
sources=bpy.data.collections.new('植物几何源 · 仅供实例');scene.collection.children.link(sources)
def leaf_source(name,kind,ma):
 vs=[];fs=[];N=8
 for i in range(N+1):
  t=i/N
  if kind=='bamboo':w=.095*sin(pi*t)**.7
  elif kind=='vine':w=.40*sin(pi*t)**.6*(.73+.27*cos(t*pi*7))
  elif kind=='grass':w=.03*(1-t)**.7
  elif kind=='petal':w=.30*sin(pi*t)**.65
  else:w=.25*sin(pi*t)**.8
  bend=.13*sin(pi*t)-.15*t*t
  vs.extend([(-w,t,bend-.045*sin(pi*t)),(0,t,bend+.035*sin(pi*t)),(w,t,bend-.045*sin(pi*t))])
 for i in range(N):
  k=i*3;fs.extend([(k,k+3,k+4,k+1),(k+1,k+4,k+5,k+2)])
 ob=objmesh(name,vs,fs,ma);smooth(ob);COL.objects.unlink(ob);sources.objects.link(ob);ob.hide_render=True;ob.hide_set(True);return ob
leafsrc=[leaf_source('榆叶原型 '+str(i),'elm',m) for i,m in enumerate(leafm)]
bambsrc=[leaf_source('披针竹叶 '+str(i),'bamboo',m) for i,m in enumerate(leafm)]
vinesrc=[leaf_source('掌状瓜叶 '+str(i),'vine',m) for i,m in enumerate(leafm)]
grasssrc=[leaf_source('草叶 '+str(i),'grass',m) for i,m in enumerate(leafm)]
def instances(name,source,points,rots,scales):
 if not points:return
 ob=objmesh(name,points,[])
 for an,vals in [('rotation',rots),('size',scales)]:
  a=ob.data.attributes.new(an,'FLOAT_VECTOR','POINT')
  a.data.foreach_set('vector',[v for v3 in vals for v in v3])
 ng=bpy.data.node_groups.new(name+' · 可编辑实例分布','GeometryNodeTree');ng.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');ng.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
 n=ng.nodes;l=ng.links;inp=n.new('NodeGroupInput');out=n.new('NodeGroupOutput');info=n.new('GeometryNodeObjectInfo');info.inputs['Object'].default_value=source;info.transform_space='ORIGINAL'
 ip=n.new('GeometryNodeInstanceOnPoints');l.new(inp.outputs['Geometry'],ip.inputs['Points']);l.new(info.outputs['Geometry'],ip.inputs['Instance'])
 for an,sock in [('rotation','Rotation'),('size','Scale')]:
  a=n.new('GeometryNodeInputNamedAttribute');a.data_type='FLOAT_VECTOR';a.inputs['Name'].default_value=an;l.new(a.outputs['Attribute'],ip.inputs[sock])
 l.new(ip.outputs[0],out.inputs[0]);mod=ob.modifiers.new('原生叶片实例','NODES');mod.node_group=ng;return ob

def leafrot(v,roll=0):return Vector(v).to_track_quat('Y','Z').to_euler()
# Branch skeleton: forks distribute irregularly into broad, porous crown.
collection('05 · 榆树与竹林')
random.seed(403)
root=Vector((3.35,.9,.44));trunkpts=[root,Vector((3.22,.90,1.12)),Vector((3.41,.93,2.02)),Vector((3.31,.93,2.76)),Vector((3.36,1.03,3.60))]
curve('主干 · 起伏收径',trunkpts,.28,bark,[1.22,1,.77,.55,.28],4)
for i in range(9):
 a=2*pi*i/9;end=root+Vector((.55*cos(a),.45*sin(a),-.02));curve('盘根',[(root.x,root.y,.81),(root.x+.19*cos(a),root.y+.16*sin(a),.51),end],.10,bark,[.80,.7,.05],3)
# longitudinal bark ridges are attached to the actual trunk, not free ornaments
for i in range(16):
 a=2*pi*i/16;pts=[]
 for j,p in enumerate(trunkpts):
  r=[.33,.26,.20,.135,.06][j];pts.append(p+Vector((r*cos(a+.17*sin(j)),r*sin(a+.17*sin(j)),0)))
 curve('树皮纵向沟脊',pts,.013,woodLight,[1,.8,.6,.5,.15],2)
leafsets=[([],[],[]) for _ in leafm]
for limb in range(16):
 a=limb*2.399+random.uniform(-.2,.2);start=trunkpts[2 if limb<6 else 3]
 spread=random.uniform(.65,1.60);end=Vector((3.35+spread*cos(a),.95+spread*.75*sin(a),random.uniform(3.62,4.72)))
 mid=start.lerp(end,.53)+Vector((0,0,.12));curve('一级分枝 %02d'%limb,[start,mid,end],.115 if limb<6 else .078,bark,[1,.62,.20],3)
 for twig in range(5):
  a2=a+random.uniform(-1.4,1.4);tip=end+Vector((random.uniform(.20,.65)*cos(a2),random.uniform(.20,.65)*sin(a2),random.uniform(.08,.65)))
  curve('二级细枝',[mid.lerp(end,.60),end,tip],.036,bark,[1,.65,.08],2)
  # Dense leaf clusters with real empty intervals between terminal sprays.
  for k in range(310):
   theta=random.uniform(0,2*pi);ct=random.uniform(-1,1);rr=random.random()**.333
   p=tip+Vector((.62*rr*sqrt(1-ct*ct)*cos(theta),.54*rr*sqrt(1-ct*ct)*sin(theta),.38*rr*ct))
   idx=random.choices(range(6),weights=[2,3,3,2,1,2])[0];points,rots,scales=leafsets[idx];points.append(tuple(p));rots.append((random.uniform(-.8,.9),random.uniform(-.7,.7),random.uniform(-pi,pi)));s=random.uniform(.10,.17);scales.append((s,s,s))
for i,(p,r,s) in enumerate(leafsets):instances('榆树分层叶冠 '+str(i),leafsrc[i],p,r,s)
# Bamboo, actual nodes with taper and leaf sprays.
random.seed(26);bsets=[([],[],[]) for _ in leafm]
for zone,cx,cy,count in [('左竹',-5.20,1.06,18),('后竹',-.80,4.27,25)]:
 for k in range(count):
  x=cx+random.uniform(-.40,.45) if zone=='左竹' else cx+random.uniform(-1.95,1.8);y=cy+random.uniform(-1.0,1.0) if zone=='左竹' else cy+random.uniform(-.30,.28)
  high=random.uniform(3.5,5.5) if zone=='左竹' else random.uniform(4.7,6.35);lean=Vector((random.uniform(-.35,.35),random.uniform(-.3,.3),0));basep=Vector((x,y,h(x,y)));top=basep+Vector((0,0,high))+lean
  curve('竹秆 '+zone,[basep,basep.lerp(top,.6),top],.032,bamboo,[1,.75,.25],2)
  nodes=int(high/.36)
  for j in range(1,nodes):
   t=j/nodes;p=basep.lerp(top,t)
   rod('竹节环',p-Vector((0,0,.012)),p+Vector((0,0,.012)),.037*(1-t*.6),woodLight,vertices=8)
   if t<.38:continue
   a=k*1.7+j*2.4;direction=Vector((cos(a),sin(a),.20));endpoint=p+direction*random.uniform(.40,.75)
   curve('竹枝',[p,p.lerp(endpoint,.45)+Vector((0,0,.12)),endpoint],.008,bamboo,[1,.6,.05],1)
   for q in range(9):
    pos=p.lerp(endpoint,.23+q*.085);lr=(-1)**q;v=Vector((cos(a+lr*.7),sin(a+lr*.7),random.uniform(-.40,.35)))
    idx=random.randrange(6);pp,rr,ss=bsets[idx];pp.append(tuple(pos));rr.append(tuple(leafrot(v)));s=random.uniform(.28,.46);ss.append((s,s,s))
for i,(p,r,s) in enumerate(bsets):instances('竹叶飞簇 '+str(i),bambsrc[i],p,r,s)

collection('03A · 丝瓜与藤蔓')
random.seed(82);vsets=[([],[],[]) for _ in leafm]
# spiraling climbing vines from soil to overhead grid
for k in range(9):
 x=random.choice([-5.04,-2.94])+random.uniform(-.045,.045);y=random.uniform(-2.3,-.20);pts=[]
 for j in range(18):t=j/17;pts.append((x+.10*sin(t*6*pi),y+.09*cos(t*6*pi),.46+t*2.53))
 curve('攀缘藤',pts,.014,leafm[3],res=2)
 for j in range(12):
  t=j/12;p=Vector((x+.1*sin(t*6*pi),y+.10*cos(t*6*pi),.65+t*2.2));idx=random.randrange(6);pp,rr,ss=vsets[idx];pp.append(tuple(p));rr.append((random.uniform(.2,1.7),random.uniform(-.4,.4),random.uniform(-pi,pi)));s=random.uniform(.32,.50);ss.append((s,s,s))
for k in range(12):
 y=-2.32+k*.20;pts=[(-5.10+t*2.20,y+.12*sin(t*8+k),3.035+.07*sin(t*pi)) for t in [0,.2,.4,.6,.8,1]];curve('棚上纵横瓜藤',pts,.014,leafm[3],res=2)
 for j in range(12):
  x=-5.07+j*.19;p=(x,y+random.uniform(-.16,.16),3.07+random.uniform(0,.11));idx=random.randrange(6);pp,rr,ss=vsets[idx];pp.append(p);rr.append((random.uniform(-.7,.6),random.uniform(-.5,.5),random.uniform(-pi,pi)));s=random.uniform(.29,.49);ss.append((s,s,s))
for i,(p,r,s) in enumerate(vsets):instances('掌叶攀覆 '+str(i),vinesrc[i],p,r,s)
# Luffa fruits are closed tapered lofts with ten longitudinal ribs, not generic capsules.
gourd=mat('丝瓜 · 纵棱表皮',(.285,.365,.045),.6,'wood');gourdline=mat('丝瓜浅棱',(.37,.43,.075),.7)
for k,(x,y,L) in enumerate([(-4.85,-2.05,.82),(-4.40,-1.85,1.02),(-3.93,-2.18,1.18),(-3.38,-2.0,.90),(-2.98,-1.37,1.04),(-4.70,-.85,.78),(-3.48,-.55,.78),(-4.2,-1.18,.68)]):
 z=2.83;curve('瓜柄',[(x+.03,y,3.07),(x+.01,y,z+.1),(x,y,z)],.017,leafm[3],res=2)
 vs=[];fs=[];R=40;N=20
 for i in range(N+1):
  t=i/N;r=.071*sin(pi*t)**.35*(1+.18*t)
  for j in range(R):a=j*2*pi/R;rad=r*(1+.085*cos(a*10));vs.append((x+.045*sin(t*pi)+rad*cos(a),y+rad*sin(a),z-L*t))
 for i in range(N):
  for j in range(R):a=i*R+j;b=i*R+(j+1)%R;fs.append((a,b,b+R,a+R))
 ob=objmesh('悬垂丝瓜 %02d'%k,vs,fs,gourd);smooth(ob)
 for j in range(10):
  a=j*2*pi/10;curve('瓜皮纵棱',[(x+.045*sin(t*pi)+.075*sin(pi*t)**.35*cos(a),y+.075*sin(pi*t)**.35*sin(a),z-L*t) for t in [.06,.22,.4,.6,.8,.95]],.0025,gourdline,res=1)
# small corkscrew tendrils
for i in range(13):
 x=random.uniform(-5,-2.95);y=random.uniform(-2.35,-.1);z=3.05
 curve('卷须',[(x+.035*cos(t*.55),y+t*.007,z+.035*sin(t*.55)) for t in range(25)],.004,leafm[2],res=1)

collection('07 · 院落生活器物')
# Exterior table with joinery and actual separate boards.
for x in (.0,1.03):
 for y in (-.72,-1.25):box('方桌榫接腿',(x,y,.80),(.075,.075,.74),wood,.012)
for y in (-.70,-1.26):box('方桌裙板',(.515,y,1.05),(1.13,.055,.20),wood,.012)
for j in range(5):box('桌面木板',(.515,-1.31+j*.15,1.18),(1.27,.141,.075),wood,.012)
for x,y in [(1.36,-1.03),(.6,-1.65),(-.20,-1.10)]:
 box('小方凳面',(x,y,.74),(.39,.33,.065),woodLight,.014)
 for dx in (-.135,.135):
  for dy in (-.105,.105):box('凳腿',(x+dx,y+dy,.572),(.039,.039,.32),wood,.006)
# Lathe vessels for earthenware, plates, bowls, tea cups
ceramic=mat('粗陶 · 釉下砂粒',(.44,.29,.15),.50,'stone');porcelain=mat('米白瓷器',(.84,.8,.65),.24)
food=mat('米糕与玉米金黄',(.71,.43,.055),.67);foodgreen=mat('盘中青蔬',(.18,.25,.035),.6)
def lathe(name,p,profile,ma,N=32):
 vs=[];fs=[]
 for r,z in profile:
  for i in range(N):a=2*pi*i/N;vs.append((p[0]+r*cos(a),p[1]+r*sin(a),p[2]+z))
 for j in range(len(profile)-1):
  for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
 ob=objmesh(name,vs,fs,ma);smooth(ob);return ob
for x,y,rr in [(.13,-.92,.15),(.60,-.94,.145),(.92,-1.17,.12)]:
 lathe('瓷盘',(x,y,1.22),[(0,0),(.08,0),(rr,.035),(rr,.05),(.08,.023),(0,.023)],porcelain)
 for i in range(10):a=i*2.4;r=rr*sqrt((i+.5)/12);uvball('盘中食物',(x+r*cos(a),y+r*sin(a),1.266),(.026,.024,.016),food if x>.2 else foodgreen,12,6)
for x,y in [(.84,-.84),(.29,-1.20)]:lathe('小茶杯',(x,y,1.22),[(.029,0),(.037,.007),(.039,.07),(.033,.072),(.032,.016),(.01,.015)],porcelain,24)
# Lidded earthen jar on low bench left of steps
box('陶罐矮凳',(-2.73,-.56,.69),(.51,.41,.065),wood,.015)
for x in (-2.92,-2.54):
 for y in (-.7,-.4):box('矮凳脚',(x,y,.56),(.044,.044,.22),wood,.008)
lathe('带盖粗陶罐',(-2.73,-.56,.723),[(0,0),(.095,0),(.155,.085),(.155,.155),(.105,.22),(.079,.24),(.079,.25),(.063,.25)],ceramic)
lathe('陶罐盖',(-2.73,-.56,.976),[(0,0),(.104,0),(.095,.018),(.054,.03),(0,.03)],ceramic)
uvball('陶罐盖钮',(-2.73,-.56,1.022),(.027,.027,.027),wood)
# bamboo weaving lines on a basket beside rear wall
basket=mat('竹篾',(.49,.32,.11),.74)
lathe('竹篮胎',(.94,.40,.44),[(0,0),(.18,0),(.24,.3),(.23,.32),(.21,.3),(.16,.02),(0,.02)],basket)
for k in range(11):
 z=.46+k*.026;r=.18+(z-.44)*.20
 curve('竹篮横篾',[(.94+r*cos(a),.4+r*sin(a),z) for a in [i*2*pi/32 for i in range(33)]],.006,woodLight,res=1)
curve('竹篮提手',[(.71,.4,.75),(.74,.4,.93),(.94,.4,1.00),(1.14,.4,.93),(1.17,.4,.75)],.014,basket,res=2)

# Ground dressing respects courtyard circulation, house and river masks.
collection('08 · 草甸、溪岸与花境')
random.seed(681)
def open_ground(x,y):return not(-4.08<x<1.4 and -.04<y<3.78) and abs(x-river(y))>width(y)+.06
# Pebbles: shared mesh source and native Geometry Nodes instance fields.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);rocksrc=move_col(bpy.context.object);rocksrc.name='自制风化卵石源';rocksrc.data.materials.append(stoneLight)
for v in rocksrc.data.vertices:v.co*=random.uniform(.83,1.13)
bevel(rocksrc,.08,2);smooth(rocksrc);COL.objects.unlink(rocksrc);sources.objects.link(rocksrc);rocksrc.hide_render=True;rocksrc.hide_set(True)
p=[];r=[];s=[]
for i in range(1100):
 x=random.uniform(-5.67,5.67);y=random.uniform(-4.8,4.8)
 if not open_ground(x,y):continue
 rr=random.uniform(.018,.065);p.append((x,y,h(x,y)+rr*.22));r.append((random.random(),random.random(),random.random()*pi));s.append((rr,rr*.8,rr*.58))
# Bigger cobbles along winding water, skip bridge access.
for j in range(125):
 y=-4.8+j*9.6/124
 for side in (-1,1):
  if abs(y-by)<.58:continue
  x=river(y)+side*(width(y)+random.uniform(.05,.24));rr=random.uniform(.07,.19);p.append((x,y,h(x,y)+rr*.20));r.append((random.random(),random.random(),random.random()*pi));s.append((rr,rr*.8,rr*.6))
for x,y,rr in [(-5.05,-2.95,.30),(-4.65,-2.79,.22),(4.87,-3.5,.23),(2.53,2.9,.28)]:p.append((x,y,h(x,y)+.09));r.append((.2,.3,1));s.append((rr,rr*.84,rr*.61))
instances('砾石与溪岸卵石',rocksrc,p,r,s)
# Grass spread into irregular tufts; no carpet covering courtyard.
gsets=[([],[],[]) for _ in leafm]
for i in range(2900):
 x=random.uniform(-5.69,5.69);y=random.uniform(-4.82,4.82)
 if not open_ground(x,y):continue
 margin=min(5.7-abs(x),4.84-abs(y));dr=abs(x-river(y))-width(y)
 dense=margin<.65 or dr<.5 or (y>1.2) or (x<-4.3)
 if not dense and random.random()>.055:continue
 if abs(y-by)<.7 and abs(x-bx)<1.6:continue
 for j in range(random.randrange(5,10)):
  xx=x+random.uniform(-.07,.07);yy=y+random.uniform(-.07,.07);idx=random.randrange(6);p,r,s=gsets[idx];p.append((xx,yy,h(xx,yy)+.005));r.append((random.uniform(.35,1.2),random.uniform(-.5,.5),random.uniform(-pi,pi)));sc=random.uniform(.14,.33);s.append((sc,sc,sc))
for i,(p,r,s) in enumerate(gsets):instances('草丛高低层 '+str(i),grasssrc[i],p,r,s)
# Flower border: individually posed leafy stems and five curved petals.
pinkm=[mat('凤仙花 '+str(i),c,.5) for i,c in enumerate([(.72,.035,.12),(.96,.17,.29),(.83,.30,.38)])]
petals=[leaf_source('凤仙花瓣 '+str(i),'petal',m) for i,m in enumerate(pinkm)]
centermat=mat('花蕊暖黄',(.97,.62,.11),.55)
fsets=[([],[],[]) for _ in leafm];psets=[([],[],[]) for _ in pinkm]
for plant in range(55):
 x=random.uniform(-1.6,2.0);y=-3.95+random.uniform(-.35,.25)+.10*x;z=h(x,y);hh=random.uniform(.28,.63)
 curve('凤仙花茎',[(x,y,z),(x+.03,y,z+hh*.6),(x+.055,y+.035,z+hh)],.007,leafm[3],res=1)
 for j in range(5):
  idx=random.randrange(6);p,r,s=fsets[idx];p.append((x+.02,y,z+hh*(.15+j*.13)));r.append((random.uniform(.0,.4),random.uniform(-.1,.1),j*2.4));sc=random.uniform(.16,.26);s.append((sc*.6,sc,sc))
 for k in range(random.randrange(1,4)):
  fx=x+random.uniform(-.1,.1);fy=y+random.uniform(-.1,.1);fz=z+hh-random.uniform(0,.16);idx=random.randrange(3)
  for j in range(5):
   p,r,s=psets[idx];p.append((fx,fy,fz));r.append((random.uniform(-.1,.3),random.uniform(-.1,.2),j*2*pi/5));sc=random.uniform(.09,.13);s.append((sc,sc,sc))
  uvball('花心',(fx,fy,fz+.009),(.021,.021,.012),centermat,10,6)
for i,(p,r,s) in enumerate(fsets):instances('花境叶片 '+str(i),bambsrc[i],p,r,s)
for i,(p,r,s) in enumerate(psets):instances('五瓣花簇 '+str(i),petals[i],p,r,s)
# Tiny wildflowers sparse at streamside
for i in range(33):
 y=random.uniform(-4.7,3.7);x=river(y)+random.choice([-1,1])*(width(y)+random.uniform(.25,.6))
 if abs(y-by)<.7 or not open_ground(x,y):continue
 z=h(x,y);hh=random.uniform(.15,.29);rod('溪岸花葶',(x,y,z),(x+.02,y,z+hh),.004,leafm[3],vertices=6)
 for k in range(5):a=k*2*pi/5;uvball('溪岸黄小花',(x+.02+.021*cos(a),y+.021*sin(a),z+hh),(.017,.015,.009),centermat,8,5)

exec(compile((ROOT/'source/animals.py').read_text(),'animals.py','exec'))
