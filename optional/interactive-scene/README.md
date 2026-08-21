# Interactive Scene Module

This opt-in module adds the Ooops scene core/Astro packages and a compact native
WebGPU-first pointer-distortion reference with an automatic WebGL 2 fallback. It
avoids shipping the full Three.js renderer stack for a procedural full-screen shader.

```sh
pnpm setup:module -- add interactiveScene --package-source=local
pnpm dev
```

Open `/interactive-scene`. Use the public `ooops:scene-mode` event to switch between editor
selection and scene interaction. Scene internals remain developer-owned and locked; only controls
declared in `editor/scenes/reference-scene.json` are editor-visible. The companion
`editor/extensions/reference-scene.json` groups those props into effect, appearance, interaction,
quality and fallback controls without exposing shader internals.

WebGPU adapter, device or pipeline setup failures fall back before the canvas is
committed to a renderer. The forced `/interactive-scene-webgl2` route remains a
cross-browser diagnostic. No CDN runtime, microphone/camera access or asset
transcoding is used.
