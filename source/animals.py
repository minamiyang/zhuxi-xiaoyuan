collection('09 · 母鸡、小鸡与溪鸭')
rust=mat('母鸡金棕羽',(.49,.195,.027),.67);ochre=mat('颈羽金黄',(.72,.32,.046),.59)
featherdark=mat('尾羽深褐',(.085,.053,.023),.64);feathermid=mat('翅羽棕',(.32,.11,.025),.67)
yellow=mat('小鸡绒羽',(.87,.62,.19),.87);beakmat=mat('喙与足',(.62,.28,.038),.63)
red=mat('鸡冠肉红',(.63,.026,.012),.47);eye=mat('眼珠',(.009,.008,.005),.19)
cream=mat('鸭羽米褐',(.58,.48,.31),.73);duckdark=mat('鸭翼褐色',(.15,.105,.055),.7);duckwhite=mat('鸭羽浅缘',(.73,.68,.52),.62)
# Feather source; unique shell profiles, as surface-attached plates.
feathers=[leaf_source('覆羽源 '+str(i),'elm',m) for i,m in enumerate([rust,ochre,featherdark,feathermid,cream,duckdark,duckwhite])]

def bird(name,p,scale,angle,chick=False,duck=False):
 start=set(scene.objects)
 def ball(n,pos,s,ma,seg=20):return uvball(name+' · '+n,pos,s,ma,seg,12)
 ma=cream if duck else yellow if chick else rust
 # Primary form is voxel-fused into a single watertight skin.
 pieces=[]
 if duck:
  pieces.append(ball('身体',(0,0,.22),(.205,.35,.17),ma));pieces.append(ball('颈根',(0,-.235,.31),(.105,.13,.18),ma));pieces.append(ball('颈',(0,-.30,.44),(.084,.09,.15),ma));pieces.append(ball('头',(0,-.34,.55),(.108,.13,.105),ma));head=(0,-.34,.55)
 elif chick:
  pieces.append(ball('绒球身体',(0,0,.19),(.135,.17,.14),ma));pieces.append(ball('头',(0,-.13,.34),(.095,.098,.098),ma));head=(0,-.13,.34)
 else:
  pieces.append(ball('身体',(0,0,.50),(.235,.34,.255),ma));pieces.append(ball('颈肩',(0,-.20,.62),(.145,.17,.23),ma));pieces.append(ball('昂首颈',(0,-.27,.80),(.090,.1,.20),ma));pieces.append(ball('头',(0,-.30,.95),(.099,.118,.12),ma));head=(0,-.30,.95)
 bpy.ops.object.select_all(action='DESELECT')
 for ob in pieces:ob.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();skin=pieces[0];skin.name=name+' · 连续身体'
 re=skin.modifiers.new('身体融合拓扑','REMESH');re.mode='VOXEL';re.voxel_size=.012 if chick else .018;re.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=re.name)
 sm=skin.modifiers.new('平滑有机曲面','SMOOTH');sm.factor=1.0;sm.iterations=3
 # Eyes and tiny catchlights
 for s in (-1,1):
  ep=(s*(.089 if not chick else .078),head[1]-.052,head[2]+.025)
  ball('眼',ep,(.012,.009,.012) if chick else (.013,.010,.014),eye,12)
  ball('眼高光',(ep[0]*1.035,ep[1]-.003,ep[2]+.004),(.003,.003,.003),duckwhite,8)
 if duck:
  ball('扁喙',(0,-.485,.535),(.066,.093,.023),beakmat)
  ball('尾尖',(0,.325,.27),(.10,.14,.065),duckdark)
  for s in (-1,1):
   wing=ball('折叠鸭翼',(s*.154,.07,.285),(.078,.243,.077),duckdark)
   # orderly overlapping pin feathers on each flank, outline contrasting edges.
   for j in range(9):
    yy=-.06+j*.031;zz=.30-.05*(j/9);ob=ball('鸭翼覆羽',(s*.202,yy,zz),(.020,.065,.025),duckwhite if j%3==0 else cream,14);ob.rotation_euler[0]=-.35
  # Soft eye stripe as a curve hugging head
  for s in (-1,1):curve(name+' · 眼后羽纹',[(s*.096,-.36,.573),(s*.103,-.31,.574),(s*.094,-.27,.562)],.009,duckdark,res=2)
 elif chick:
  rod(name+' · 小喙',(0,-.218,.334),(0,-.27,.325),.025,beakmat,.002,vertices=10)
  for s in (-1,1):ball('绒翅',(s*.118,.01,.21),(.04,.09,.066),ochre,16)
  ball('小尾',(0,.16,.24),(.042,.066,.06),yellow,14)
 else:
  rod(name+' · 尖喙',(0,-.407,.936),(0,-.48,.919),.039,beakmat,.001,vertices=12)
  for j in range(5):ball('波状鸡冠',(0,-.35+j*.036,1.071+sin(j*pi/4)*.025),(.028,.025,.044),red,14)
  ball('肉垂左',(-.028,-.368,.869),(.028,.025,.058),red,16);ball('肉垂右',(.028,-.368,.869),(.028,.025,.058),red,16)
  for side in (-1,1):
   ball('翼基',(side*.192,.015,.55),(.07,.23,.15),feathermid)
   for row in range(3):
    for j in range(9):
     yy=-.12+j*.041;zz=.60-row*.052-.06*(j/9);xx=side*(.235+.012*sin(j*.4))
     ob=ball('层叠翅羽',(xx,yy,zz),(.025,.088,.034),rust if row<2 else ochre,14);ob.rotation_euler[0]=-.30
  # Graceful fan of long curved tail feathers, individual barbs.
  for j in range(9):
   a=(j-4)*.17;pts=[(a*.07,.22,.60),(a*.23,.42,.78),(a*.35,.49,1.0-abs(a)*.20),(a*.38,.44,1.06-abs(a)*.22)]
   curve(name+' · 弧形尾羽',pts,.038,featherdark,[.8,1,.60,.035],3)
   curve(name+' · 尾羽金边',[(x-.013,y-.021,z) for x,y,z in pts],.005,ochre,[.4,.8,.6,.01],1)
  # narrow neck plumage, feather-shaped instances
  pp=[];rr=[];ss=[]
  for j in range(60):
   a=j*2.4;t=(j%12)/12;z=.66+t*.23;rad=.106-.026*t;pp.append((rad*cos(a),-.257+rad*sin(a),z));rr.append(tuple(leafrot((.22*cos(a),.22*sin(a),-1))));ss.append((.065,.10,.065))
  instances(name+' · 颈部披羽',feathers[1],pp,rr,ss)
 # Feet touch ground. Ducks use hidden webbed feet below the waterline.
 if not duck:
  for s in (-1,1):
   x=s*(.06 if chick else .10);z=.105 if chick else .26
   rod(name+' · 胫',(x,.012,.14 if chick else .39),(x,-.013,.032),.010 if chick else .018,beakmat,vertices=10)
   for toe in (-1,0,1):curve(name+' · 趾',[(x,-.013,.041),(x+toe*.022,-.06,.025),(x+toe*.03,-.11 if not chick else -.080,.018)],.006 if chick else .009,beakmat,[1,.7,.20],1)
 rootob=bpy.data.objects.new(name,None);COL.objects.link(rootob)
 for ob in set(scene.objects)-start:
  if ob!=rootob and ob.parent is None:ob.parent=rootob
 rootob.location=p;rootob.scale=(scale,scale,scale);rootob.rotation_euler[2]=angle
 return rootob

bird('母鸡',(-2.00,-2.87,h(-2,-2.87)+.012),.95,.55)
for i,(x,y,a) in enumerate([(-.93,-3.12,-.2),(-.23,-2.96,.5),(.37,-2.68,-.2),(.94,-2.60,.4),(.45,-2.09,-.7),(-.09,-2.24,.1)]):bird('小鸡 %d'%(i+1),(x,y,h(x,y)+.005),.90+random.uniform(-.07,.08),a,True)
for i,(y,a) in enumerate([(-2.70,-.35),(-3.92,2.25)]):bird('溪鸭 %d'%(i+1),(river(y)+(-.03 if i==0 else .11),y,.33),.88,a,duck=True)
# Ripples are tiny surface-displacement rings, subtle translucency, no floating white hoops.
ripplemat=mat('薄水波高光',(.34,.39,.29),.13);rp=ripplemat.node_tree.nodes.get('Principled BSDF');rp.inputs['Transmission Weight'].default_value=.70;rp.inputs['IOR'].default_value=1.333
for y in (-2.7,-3.92):
 for j in range(3):
  r=.30+j*.17;pts=[]
  for k in range(81):a=2*pi*k/80;pts.append((river(y)+r*.75*cos(a),y+r*sin(a),.365+.002*sin(5*a)))
  curve('鸭后涟漪',pts,.0045,ripplemat,res=1)
# Embedded dark river stones make the water depth legible.
collection('01A · 水下卵石')
pp=[];rr=[];ss=[]
for i in range(150):
 y=random.uniform(-4.8,4.8);x=river(y)+random.uniform(-.55,.55);r=random.uniform(.03,.09);pp.append((x,y,.278));rr.append((random.random(),random.random(),random.random()*pi));ss.append((r,r*.8,r*.35))
instances('浅溪透视河床石',rocksrc,pp,rr,ss)
