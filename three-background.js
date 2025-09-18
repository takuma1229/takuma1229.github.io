import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';

const canvas = document.getElementById('hero-canvas');
const container = document.querySelector('.hero');

if (!canvas || !container) {
  console.warn('Hero canvas element not found; skipping Three.js background.');
} else {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0f172a, 0.045);

  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 1.2, 16);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x6366f1, 18, 35);
  keyLight.position.set(6, 6, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x0ea5e9, 8, 25);
  fillLight.position.set(-6, -4, 6);
  scene.add(fillLight);

  const orbGeometry = new THREE.IcosahedronGeometry(3.2, 2);
  const orbMaterial = new THREE.MeshStandardMaterial({
    color: 0x4338ca,
    metalness: 0.4,
    roughness: 0.35,
    emissive: 0x312e81,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.7,
  });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  scene.add(orb);

  const orbEdges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.2, 2));
  const orbWire = new THREE.LineSegments(
    orbEdges,
    new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.35,
    }),
  );
  scene.add(orbWire);

  const PARTICLE_COUNT = 900;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const speeds = new Float32Array(PARTICLE_COUNT);
  const offsets = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 8;
    const height = (Math.random() - 0.5) * 6;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    speeds[i] = 0.5 + Math.random() * 0.7;
    offsets[i] = Math.random() * Math.PI * 2;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
  particleGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.14,
    color: 0xe0e7ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.position.y = 0.4;
  scene.add(particles);

  const flowGeometry = new THREE.TorusKnotGeometry(6.5, 0.16, 220, 16, 2, 3);
  const flowMaterial = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.18,
  });
  const flowMesh = new THREE.Mesh(flowGeometry, flowMaterial);
  scene.add(flowMesh);

  const mouseTarget = new THREE.Vector2();
  const smoothMouse = new THREE.Vector2();
  const pointerNDC = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.2);
  const intersectionPoint = new THREE.Vector3();
  const cursorTarget = new THREE.Vector3(0, 0.8, 2.2);
  const cursorPosition = cursorTarget.clone();

  const cursorGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const cursorGlow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), cursorGlowMaterial);
  cursorGlow.visible = true;
  scene.add(cursorGlow);

  const cursorHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cursorHalo = new THREE.Mesh(new THREE.RingGeometry(0.65, 1, 64), cursorHaloMaterial);
  cursorHalo.rotation.x = Math.PI / 2;
  cursorGlow.add(cursorHalo);

  const cursorLinkMaterial = new THREE.LineBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const linkPositions = new Float32Array([
    cursorPosition.x, cursorPosition.y, cursorPosition.z,
    orb.position.x, orb.position.y, orb.position.z,
  ]);
  const cursorLinkGeometry = new THREE.BufferGeometry();
  cursorLinkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
  const cursorLink = new THREE.Line(cursorLinkGeometry, cursorLinkMaterial);
  scene.add(cursorLink);

  let pointerActive = false;

  const updateMouse = (event) => {
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    mouseTarget.x = (x - 0.5) * Math.PI * 0.1;
    mouseTarget.y = (y - 0.5) * Math.PI * 0.08;
    pointerNDC.set(x * 2 - 1, -(y * 2 - 1));
    raycaster.setFromCamera(pointerNDC, camera);
    if (raycaster.ray.intersectPlane(pointerPlane, intersectionPoint)) {
      cursorTarget.copy(intersectionPoint);
      cursorTarget.x = THREE.MathUtils.clamp(cursorTarget.x, -4.5, 4.5);
      cursorTarget.y = THREE.MathUtils.clamp(cursorTarget.y, -2.8, 3.6);
    }
    pointerActive = true;
  };

  container.addEventListener('pointermove', updateMouse);
  container.addEventListener('pointerleave', () => {
    mouseTarget.set(0, 0);
    pointerActive = false;
    cursorTarget.set(0, 0.8, 2.2);
  });

  let lastTime = 0;
  let animationFrameId;

  const animate = (time) => {
    const delta = (time - lastTime) / 1000 || 0;
    lastTime = time;

    const particlePositions = particleGeometry.attributes.position;
    const particleOffsets = particleGeometry.attributes.offset;
    const particleSpeeds = particleGeometry.attributes.speed;

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const stride = i * 3;
      const offset = particleOffsets.array[i];
      const speed = particleSpeeds.array[i];
      const t = time * 0.0002 * speed + offset;

      const radius = Math.sqrt(
        particlePositions.array[stride] ** 2 + particlePositions.array[stride + 2] ** 2,
      );

      particlePositions.array[stride + 1] = Math.sin(t) * 1.5;
      particlePositions.array[stride] = Math.cos(t) * radius;
    particlePositions.array[stride + 2] = Math.sin(t + Math.PI * 0.5) * radius;
  }

  particlePositions.needsUpdate = true;

  smoothMouse.lerp(mouseTarget, 0.08);

  cursorPosition.lerp(cursorTarget, 0.12);
  cursorGlow.position.copy(cursorPosition);
  cursorGlow.rotation.y += delta * 0.6;
  cursorGlowMaterial.opacity = THREE.MathUtils.lerp(
    cursorGlowMaterial.opacity,
    pointerActive ? 0.85 : 0,
    0.12,
  );
  const haloScale = 1.15 + Math.sin(time * 0.003) * 0.25;
  cursorHalo.scale.setScalar(haloScale);
  cursorHalo.rotation.z += delta * 0.45;
  cursorHaloMaterial.opacity = THREE.MathUtils.lerp(
    cursorHaloMaterial.opacity,
    pointerActive ? 0.44 : 0,
    0.1,
  );

  linkPositions[0] = cursorPosition.x;
  linkPositions[1] = cursorPosition.y;
  linkPositions[2] = cursorPosition.z;
  linkPositions[3] = orb.position.x;
  linkPositions[4] = orb.position.y;
  linkPositions[5] = orb.position.z;
  cursorLinkGeometry.attributes.position.needsUpdate = true;
  cursorLinkMaterial.opacity = THREE.MathUtils.lerp(
    cursorLinkMaterial.opacity,
    pointerActive ? 0.36 : 0,
    0.12,
  );

  orb.rotation.y += delta * 0.2;
  orb.rotation.x += delta * 0.12;
  orbWire.rotation.copy(orb.rotation);

  particles.rotation.y += delta * 0.08;
  particles.rotation.x = THREE.MathUtils.lerp(particles.rotation.x, smoothMouse.y, 0.02);

  flowMesh.rotation.y -= delta * 0.06;
  flowMesh.rotation.z += delta * 0.04;
  flowMaterial.opacity = THREE.MathUtils.lerp(
    flowMaterial.opacity,
    pointerActive ? 0.24 : 0.18,
    0.06,
  );

  keyLight.position.x = THREE.MathUtils.lerp(keyLight.position.x, 6 + cursorPosition.x * 0.35, 0.08);
  keyLight.position.y = THREE.MathUtils.lerp(keyLight.position.y, 6 + cursorPosition.y * 0.25, 0.08);
  fillLight.position.x = THREE.MathUtils.lerp(fillLight.position.x, -6 + cursorPosition.x * 0.3, 0.08);
  fillLight.position.y = THREE.MathUtils.lerp(fillLight.position.y, -4 + cursorPosition.y * 0.2, 0.08);

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, smoothMouse.x * 12, 0.04);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.2 + smoothMouse.y * 6, 0.04);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(animate);
  };

  const handleResize = () => {
    const { clientWidth, clientHeight } = container;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  handleResize();

  const start = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    const isReduced = prefersReducedMotion.matches;
    cursorGlow.visible = !isReduced;
    cursorLink.visible = !isReduced;

    if (isReduced) {
      pointerActive = false;
      cursorGlowMaterial.opacity = 0;
      cursorHaloMaterial.opacity = 0;
      cursorLinkMaterial.opacity = 0;
      orb.rotation.set(0.3, 0.6, 0);
      orbWire.rotation.copy(orb.rotation);
      renderer.render(scene, camera);
      return;
    }

    lastTime = 0;
    animationFrameId = requestAnimationFrame(animate);
  };

  prefersReducedMotion.addEventListener('change', start);
  start();
}
