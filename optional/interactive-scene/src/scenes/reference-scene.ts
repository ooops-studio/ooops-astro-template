import {AmbientLight, Color, DirectionalLight, Mesh, Vector2} from 'three'
import {mix, uniform} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import type {InteractiveSceneRuntimeManifest} from '@ooopsstudio/scene-core'
import {defineThreeScene} from '@ooopsstudio/scene-three'

import runtimeManifestSource from './reference-scene.runtime.json'

type ReferenceSceneConfig = {
  intensity?: number;
  rotationSpeed?: number;
  pointerStrength?: number;
  distortion?: number;
  primaryColor?: string;
  secondaryColor?: string;
  model?: string;
};

const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

const safeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const safeAsset = (value: unknown) =>
  typeof value === 'string' && /^\/assets\/[A-Za-z0-9_./-]+\.(?:glb|gltf)$/.test(value)
    ? value
    : '/assets/scenes/reference.glb';

const runtimeManifest = Object.freeze(runtimeManifestSource as InteractiveSceneRuntimeManifest);

const createReferenceScene = (manifest: InteractiveSceneRuntimeManifest) =>
  defineThreeScene<ReferenceSceneConfig>({
  manifest,
  async setup({scene, camera, assets, resources, config}) {
    const pointer = uniform(new Vector2());
    const pointerStrength = uniform(bounded(config.pointerStrength, 0.8, 0, 2));
    const intensity = uniform(bounded(config.intensity, 1, 0.2, 3));
    const primaryColor = uniform(new Color(safeColor(config.primaryColor, '#5de2c2')));
    const secondaryColor = uniform(new Color(safeColor(config.secondaryColor, '#ff6f61')));
    const material = new MeshStandardNodeMaterial();
    const pointerMix = pointer.x.add(1).mul(0.5).mul(pointerStrength).clamp(0, 1);
    material.colorNode = mix(primaryColor, secondaryColor, pointerMix).mul(intensity);
    material.roughness = 0.42;
    material.metalness = 0.12;

    const model = await assets.loadModel(safeAsset(config.model));
    model.scene.traverse((object) => {
      if (object instanceof Mesh) object.material = material;
    });
    scene.add(model.scene);
    const ambient = resources.track(new AmbientLight('#ffffff', 1.5));
    const directional = resources.track(new DirectionalLight('#ffffff', 3));
    directional.position.set(2, 3, 4);
    scene.add(ambient, directional);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    let rotationSpeed = bounded(config.rotationSpeed, 0.35, 0, 1.5);
    let distortion = bounded(config.distortion, 0.5, 0, 1.5);
    let pointerX = 0;
    let pointerY = 0;
    return {
      update(next) {
        rotationSpeed = bounded(next.rotationSpeed, 0.35, 0, 1.5);
        distortion = bounded(next.distortion, 0.5, 0, 1.5);
        pointerStrength.value = bounded(next.pointerStrength, 0.8, 0, 2);
        intensity.value = bounded(next.intensity, 1, 0.2, 3);
        primaryColor.value.set(safeColor(next.primaryColor, '#5de2c2'));
        secondaryColor.value.set(safeColor(next.secondaryColor, '#ff6f61'));
      },
      pointer(input) {
        pointerX = input.normalizedX;
        pointerY = input.normalizedY;
        pointer.value.set(input.normalizedX, input.normalizedY);
      },
      frame(frame) {
        model.scene.rotation.y += (frame.delta / 1000) * rotationSpeed;
        model.scene.rotation.x = Math.sin(frame.time * 0.00035) * (0.05 + distortion * 0.2) + pointerY * distortion * 0.15;
        model.scene.rotation.z = pointerX * distortion * 0.12;
      }
    };
  }
  });

const webglManifest = Object.freeze({
  ...runtimeManifest,
  id: 'reference-scene-webgl2',
  backend: 'webgl2'
} as const satisfies InteractiveSceneRuntimeManifest);

export const referenceScene = createReferenceScene(runtimeManifest);
export const referenceSceneWebgl2 = createReferenceScene(webglManifest);
