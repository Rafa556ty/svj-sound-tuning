import * as THREE from 'three';

/** Local textured workshop, real-scale around the shared normalized car. */
export function addGarageEnvironment(scene: THREE.Scene) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  if (!g) return;
  g.fillStyle = '#646b70'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    g.fillStyle = i % 2 ? '#72787c' : '#555d62';
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  g.strokeStyle = '#3e464c'; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8, 8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshStandardMaterial({ map: tex, metalness: .15, roughness: .56 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.015; floor.receiveShadow = true; scene.add(floor);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x70777b, roughness: .8, map: tex });
  const metal = new THREE.MeshStandardMaterial({ color: 0x272f34, roughness: .36, metalness: .65 });
  const red = new THREE.MeshStandardMaterial({ color: 0x941f28, roughness: .34, metalness: .6 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
  };
  box(22, 5, .25, 0, 2.5, -7, concrete); box(.25,5,19,-10,2.5,1,concrete); box(.25,5,19,10,2.5,1,concrete);
  box(6,3.5,.15,0,1.75,-6.8,metal);
  for(let i=0;i<14;i++) box(6,.035,.04,0,.2+i*.24,-6.69,concrete);
  box(2.1,1.05,.65,-5.4,.525,-5.8,red);
  for(let i=0;i<5;i++) box(1.95,.025,.035,-5.4,.16+i*.18,-5.45,metal);
  box(2.6,.12,1,5,1.05,-5.8,metal);
  for(const x of [4,6]) box(.12,1,.7,x,.5,-5.8,metal);
  const rubber = new THREE.MeshStandardMaterial({color:0x141619,roughness:.88});
  for (const x of [-7.6,7.6]) for(let i=0;i<4;i++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(.4,.15,12,40),rubber);
    tire.rotation.x = Math.PI/2; tire.position.set(x,.18+i*.29,-4.9); tire.castShadow = true; scene.add(tire);
    for(let j=0;j<28;j++) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(.045,.27,.03),rubber);
      const a=j/28*Math.PI*2; tread.position.set(x+Math.cos(a)*.543,.18+i*.29,-4.9+Math.sin(a)*.543); tread.rotation.y=-a; scene.add(tread);
    }
  }
  const white = new THREE.MeshStandardMaterial({color:0xf0f6ff,emissive:0xe2edff,emissiveIntensity:3});
  for(const x of [-4,4]) {
    box(.18,.06,7,x,4.5,-1,white);
    const light=new THREE.PointLight(0xeaf4ff,28,15,2); light.position.set(x,3.8,-1); scene.add(light);
  }
  // Wheel racks with alloys, behind the car rather than in its frame.
  for (let i=0;i<3;i++) {
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(.36,.13,12,32),rubber); wheel.position.set(4+i*1.1,2.2,-6.65); scene.add(wheel);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.08,20),metal); rim.rotation.x=Math.PI/2; rim.position.copy(wheel.position); scene.add(rim);
  }
}