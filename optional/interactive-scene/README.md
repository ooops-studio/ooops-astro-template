# Interactive Scene Module

This opt-in module adds the three Ooops scene packages, Three.js and a compact reference scene.
The scene uses `WebGPURenderer` with automatic WebGL 2 fallback and TSL/Node Materials.

```sh
pnpm setup:module -- add interactiveScene --package-source=local
pnpm dev
```

Open `/interactive-scene`. Use the public `ooops:scene-mode` event to switch between editor
selection and scene interaction. Scene internals remain developer-owned and locked; only controls
declared in `editor/scenes/reference-scene.json` are editor-visible. The companion
`editor/extensions/reference-scene.json` groups those props into effect, appearance, interaction,
asset, quality and fallback controls without exposing shaders or the scene graph.

Projects must host Draco/KTX2 decoder files locally when those formats are used. No CDN defaults,
microphone/camera access or asset transcoding are provided.
