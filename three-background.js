import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('hero-canvas');

if (!canvas) {
  console.warn('Hero canvas element not found; skipping Three.js background.');
} else {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const getViewportSize = () => ({
    width: Math.max(window.innerWidth || 1, 1),
    height: Math.max(window.innerHeight || 1, 1),
  });

  let { width: viewportWidth, height: viewportHeight } = getViewportSize();

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020617, 0.035);

  const camera = new THREE.PerspectiveCamera(
    40,
    viewportWidth / viewportHeight,
    0.1,
    100,
  );
  camera.position.set(0, 1.6, 17);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewportWidth, viewportHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(viewportWidth, viewportHeight),
    1.1,
    0.4,
    0.88,
  );
  bloomPass.threshold = 0.12;
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  const ambient = new THREE.AmbientLight(0xffffff, 0.58);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0x7c83ff, 18, 35);
  keyLight.position.set(6, 7, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x3dd5f3, 10, 30);
  fillLight.position.set(-6, -3, 6);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0x14f1c6, 9, 28);
  rimLight.position.set(0, 6, -6);
  scene.add(rimLight);

  const auroraMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uColorA: { value: new THREE.Color(0x60a5fa) },
      uColorB: { value: new THREE.Color(0x6366f1) },
      uColorC: { value: new THREE.Color(0x14b8a6) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * modelPosition;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        mat2 rotate = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p = rotate * p;
          amplitude *= 0.55;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        uv.y += sin(uv.x * 6.28318 + uTime * 0.18) * 0.08;
        float base = fbm(uv * 3.6 + vec2(0.0, uTime * 0.08));
        float sweep = fbm(uv * 7.2 + vec2(uTime * -0.04, uTime * 0.06));
        float mask = smoothstep(0.2, 0.9, base + sweep * 0.52);
        mask += pow(max(0.0, 1.1 - length(uv - vec2(0.5, 0.45))), 3.2) * 0.38;
        mask = clamp(mask, 0.0, 1.0);

        vec3 color = mix(uColorA, uColorB, base);
        color = mix(color, uColorC, sweep * 0.8);
        color *= 0.6 + uIntensity * 0.9;

        float alpha = mask * (0.42 + uIntensity * 0.38);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const aurora = new THREE.Mesh(new THREE.PlaneGeometry(34, 18), auroraMaterial);
  aurora.position.set(0, 0.9, -5.2);
  aurora.rotation.x = THREE.MathUtils.degToRad(-12);
  scene.add(aurora);

  const orbGeometry = new THREE.IcosahedronGeometry(3.4, 3);
  const orbMaterial = new THREE.MeshStandardMaterial({
    color: 0x4338ca,
    metalness: 0.38,
    roughness: 0.32,
    emissive: 0x2f2a89,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.82,
  });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  scene.add(orb);

  const orbEdges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.4, 3));
  const orbWire = new THREE.LineSegments(
    orbEdges,
    new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(orbWire);

  const PARTICLE_COUNT = 1100;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const speeds = new Float32Array(PARTICLE_COUNT);
  const offsets = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 8.5;
    const height = (Math.random() - 0.5) * 6.2;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    speeds[i] = 0.45 + Math.random() * 0.65;
    offsets[i] = Math.random() * Math.PI * 2;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
  particleGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.12,
    color: 0xe2e8ff,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.position.y = 0.5;
  scene.add(particles);

  const flowGeometry = new THREE.TorusKnotGeometry(6.8, 0.18, 280, 24, 2, 3);
  const flowMaterial = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flowMesh = new THREE.Mesh(flowGeometry, flowMaterial);
  flowMesh.rotation.x = THREE.MathUtils.degToRad(18);
  scene.add(flowMesh);

  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  const orbitMaterials = [];
  const orbitConfigs = [
    { radius: 10.5, color: 0x38bdf8, tilt: 14, speed: -0.12 },
    { radius: 9.1, color: 0x818cf8, tilt: -10, speed: 0.16 },
    { radius: 11.8, color: 0x34d399, tilt: 20, speed: 0.08 },
  ];
  orbitConfigs.forEach((config) => {
    const geometry = new THREE.TorusGeometry(config.radius, 0.07, 64, 320);
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = THREE.MathUtils.degToRad(config.tilt);
    orbitGroup.add(ring);
    ring.userData = { speed: config.speed };
    orbitMaterials.push(material);
  });

  const SHARD_COUNT = 120;
  const shardGeometry = new THREE.CylinderGeometry(0.05, 0.2, 1.4, 6, 1, true);
  shardGeometry.translate(0, 0.7, 0);
  const shardMaterial = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, SHARD_COUNT);
  scene.add(shards);
  const shardInfos = [];
  const shardDummy = new THREE.Object3D();
  for (let i = 0; i < SHARD_COUNT; i += 1) {
    shardInfos.push({
      radius: THREE.MathUtils.randFloat(5.2, 8.8),
      height: THREE.MathUtils.randFloat(-2.5, 3.4),
      speed: THREE.MathUtils.randFloat(0.2, 0.55),
      offset: Math.random() * Math.PI * 2,
      wobble: THREE.MathUtils.randFloat(0.2, 0.55),
      twist: THREE.MathUtils.randFloatSpread(1.2),
    });
  }

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
  const cursorGlow = new THREE.Mesh(new THREE.SphereGeometry(0.48, 48, 48), cursorGlowMaterial);
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
  const cursorHalo = new THREE.Mesh(new THREE.RingGeometry(0.68, 1.05, 96), cursorHaloMaterial);
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

  const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

  const resetPointerTargets = () => {
    mouseTarget.set(0, 0);
    pointerActive = false;
    cursorTarget.set(0, 0.8, 2.2);
  };

  const updateMouse = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }

    const width = viewportWidth || window.innerWidth || 1;
    const height = viewportHeight || window.innerHeight || 1;
    const x = clamp01(event.clientX / width);
    const y = clamp01(event.clientY / height);

    mouseTarget.x = (x - 0.5) * Math.PI * 0.12;
    mouseTarget.y = (y - 0.5) * Math.PI * 0.08;
    pointerNDC.set(x * 2 - 1, -(y * 2 - 1));
    raycaster.setFromCamera(pointerNDC, camera);
    if (raycaster.ray.intersectPlane(pointerPlane, intersectionPoint)) {
      cursorTarget.copy(intersectionPoint);
      cursorTarget.x = THREE.MathUtils.clamp(cursorTarget.x, -4.8, 4.8);
      cursorTarget.y = THREE.MathUtils.clamp(cursorTarget.y, -3.2, 4.0);
      cursorTarget.z = THREE.MathUtils.clamp(cursorTarget.z, 1.4, 4.2);
    }
    pointerActive = true;
  };

  const handlePointerOut = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }
    if (event.relatedTarget) {
      return;
    }
    resetPointerTargets();
  };

  window.addEventListener('pointermove', updateMouse);
  window.addEventListener('pointerdown', updateMouse);
  window.addEventListener('pointerout', handlePointerOut);

  let lastTime = 0;
  let animationFrameId;
  const accentColor = new THREE.Color();
  const emissiveColor = new THREE.Color();

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

      particlePositions.array[stride + 1] = Math.sin(t) * 1.6;
      particlePositions.array[stride] = Math.cos(t) * radius;
      particlePositions.array[stride + 2] = Math.sin(t + Math.PI * 0.5) * radius;
    }

    particlePositions.needsUpdate = true;

    smoothMouse.lerp(mouseTarget, 0.085);

    cursorPosition.lerp(cursorTarget, 0.12);
    cursorGlow.position.copy(cursorPosition);
    cursorGlow.rotation.y += delta * 0.6;
    cursorGlowMaterial.opacity = THREE.MathUtils.lerp(
      cursorGlowMaterial.opacity,
      pointerActive ? 0.9 : 0,
      0.12,
    );
    const haloScale = 1.12 + Math.sin(time * 0.003) * 0.28;
    cursorHalo.scale.setScalar(haloScale);
    cursorHalo.rotation.z += delta * 0.5;
    cursorHaloMaterial.opacity = THREE.MathUtils.lerp(
      cursorHaloMaterial.opacity,
      pointerActive ? 0.48 : 0,
      0.1,
    );

    linkPositions[0] = cursorPosition.x;
    linkPositions[1] = cursorPosition.y;
    linkPositions[2] = cursorPosition.z;
    cursorLinkGeometry.attributes.position.needsUpdate = true;
    cursorLinkMaterial.opacity = THREE.MathUtils.lerp(
      cursorLinkMaterial.opacity,
      pointerActive ? 0.42 : 0,
      0.14,
    );

    orb.rotation.y += delta * 0.24;
    orb.rotation.x += delta * 0.14;
    orbWire.rotation.copy(orb.rotation);

    const hueShift = (time * 0.00005 + smoothMouse.x * 0.08) % 1;
    accentColor.setHSL(0.58 + Math.sin(time * 0.0002) * 0.05, 0.78, 0.55);
    emissiveColor.setHSL(0.64 + hueShift * 0.1, 0.7, 0.42 + (pointerActive ? 0.1 : 0));
    orbMaterial.emissive.copy(emissiveColor);
    orbMaterial.opacity = 0.75 + (pointerActive ? 0.12 : 0);
    orbWire.material.color.lerp(accentColor, 0.08);

    particles.rotation.y += delta * 0.1;
    particles.rotation.x = THREE.MathUtils.lerp(particles.rotation.x, smoothMouse.y, 0.02);

    flowMesh.rotation.y -= delta * 0.07;
    flowMesh.rotation.z += delta * 0.05;
    flowMaterial.opacity = THREE.MathUtils.lerp(
      flowMaterial.opacity,
      pointerActive ? 0.26 : 0.18,
      0.08,
    );

    orbitGroup.rotation.z += delta * 0.05;
    orbitGroup.rotation.x = THREE.MathUtils.lerp(orbitGroup.rotation.x, smoothMouse.y * 0.5, 0.06);
    orbitGroup.rotation.y = THREE.MathUtils.lerp(orbitGroup.rotation.y, smoothMouse.x * 0.4, 0.06);

    orbitGroup.children.forEach((ring, index) => {
      ring.rotation.z += ring.userData.speed * delta;
      orbitMaterials[index].opacity = THREE.MathUtils.lerp(
        orbitMaterials[index].opacity,
        pointerActive ? 0.32 : 0.18,
        0.08,
      );
    });

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const info = shardInfos[i];
      const angle = time * 0.00032 * info.speed + info.offset;
      const radius = info.radius + Math.sin(time * 0.0005 + info.offset) * 0.25;
      shardDummy.position.set(
        Math.cos(angle) * radius,
        info.height + Math.sin(time * 0.001 + info.offset) * 0.4,
        Math.sin(angle) * radius,
      );
      shardDummy.rotation.set(
        info.twist + Math.sin(angle * 2.0) * 0.25,
        angle,
        Math.cos(angle * 1.5) * 0.3,
      );
      const scale = 0.45 + Math.sin(angle * 4.0 + time * 0.0015) * 0.12;
      shardDummy.scale.set(scale, scale * (1.8 + info.wobble * 0.8), scale);
      shardDummy.lookAt(orb.position.x, orb.position.y + 0.4, orb.position.z);
      shardDummy.updateMatrix();
      shards.setMatrixAt(i, shardDummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
    shardMaterial.opacity = THREE.MathUtils.lerp(
      shardMaterial.opacity,
      pointerActive ? 0.42 : 0.28,
      0.1,
    );

    keyLight.position.x = THREE.MathUtils.lerp(keyLight.position.x, 6 + cursorPosition.x * 0.42, 0.08);
    keyLight.position.y = THREE.MathUtils.lerp(keyLight.position.y, 7 + cursorPosition.y * 0.28, 0.08);
    fillLight.position.x = THREE.MathUtils.lerp(fillLight.position.x, -6 + cursorPosition.x * 0.34, 0.08);
    fillLight.position.y = THREE.MathUtils.lerp(fillLight.position.y, -3 + cursorPosition.y * 0.22, 0.08);
    rimLight.position.y = THREE.MathUtils.lerp(rimLight.position.y, 6 + cursorPosition.y * 0.35, 0.08);

    auroraMaterial.uniforms.uTime.value = time * 0.0012;
    auroraMaterial.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      auroraMaterial.uniforms.uIntensity.value,
      pointerActive ? 1 : 0,
      0.06,
    );

    bloomPass.strength = THREE.MathUtils.lerp(
      bloomPass.strength,
      pointerActive ? 1.45 : 1.05,
      0.08,
    );

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, smoothMouse.x * 12, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.5 + smoothMouse.y * 7, 0.05);
    camera.lookAt(0, 0.4, 0);

    composer.render();
    animationFrameId = requestAnimationFrame(animate);
  };

  const handleResize = () => {
    ({ width: viewportWidth, height: viewportHeight } = getViewportSize());
    camera.aspect = viewportWidth / viewportHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewportWidth, viewportHeight);
    composer.setSize(viewportWidth, viewportHeight);
    bloomPass.setSize(viewportWidth, viewportHeight);
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
    shardMaterial.opacity = isReduced ? 0.18 : shardMaterial.opacity;

    if (isReduced) {
      resetPointerTargets();
      cursorGlowMaterial.opacity = 0;
      cursorHaloMaterial.opacity = 0;
      cursorLinkMaterial.opacity = 0;
      auroraMaterial.uniforms.uIntensity.value = 0.2;
      bloomPass.strength = 1.0;
      orb.rotation.set(0.3, 0.6, 0);
      orbWire.rotation.copy(orb.rotation);
      composer.render();
      return;
    }

    lastTime = 0;
    animationFrameId = requestAnimationFrame(animate);
  };

  prefersReducedMotion.addEventListener('change', start);
  start();
}
