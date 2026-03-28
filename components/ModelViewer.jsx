"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export default function ModelViewer({ url }) {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.01, 100);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.Scene()).texture;
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xffffff, 3.0));
    const key = new THREE.DirectionalLight(0xfff4e0, 3.0); key.position.set(1.5, 3, 2); scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 1.2); fill.position.set(-2, 1, 1); scene.add(fill);
    scene.add(new THREE.DirectionalLight(0xffffff, 1.0)).position.set(0, 2, -3);

    const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath("/draco/");
    const loader = new GLTFLoader(); loader.setDRACOLoader(dracoLoader);

    let mixer = null, model = null, rafId;
    let rotY = 0.3;

    loader.load(url, (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2.2 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      scene.add(model);
      const h = size.y * scale;
      camera.position.set(0, h * 0.5, h * 1.6);
      camera.lookAt(0, h * 0.45, 0);
      if (gltf.animations.length > 0) { mixer = new THREE.AnimationMixer(model); mixer.clipAction(gltf.animations[0]).play(); }
      setLoaded(true);
    });

    const clock = new THREE.Clock();
    function animate() {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);
      if (model) { rotY += dt * 0.25; model.rotation.y = rotY; }
      const W = container.clientWidth, H = container.clientHeight;
      if (W > 0 && H > 0) { renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      container.removeChild(canvas);
      renderer.dispose();
      dracoLoader.dispose();
      scene.clear();
    };
  }, [url]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/30 text-sm animate-pulse">Loading 3D model...</div>
        </div>
      )}
    </div>
  );
}
