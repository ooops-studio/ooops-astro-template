import {
  type InteractiveSceneRuntimeManifest,
  type ScenePointerInput
} from '@ooopsstudio/scene-core';
import {
  createGpuResourceTracker,
  defineGpuScene,
  type NativeGpuBindGroup,
  type NativeGpuCanvasContext,
  type NativeGpuRenderPipeline
} from '@ooopsstudio/scene-gpu';

import runtimeManifestSource from './reference-scene.runtime.json';

type ReferenceSceneConfig = {
  intensity?: number;
  pointerStrength?: number;
  distortion?: number;
  primaryColor?: string;
  secondaryColor?: string;
};

type ResolvedConfig = Required<ReferenceSceneConfig>;

type SceneUniforms = {
  resolution: WebGLUniformLocation | null;
  pointer: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
  pointerStrength: WebGLUniformLocation | null;
  distortion: WebGLUniformLocation | null;
  primaryColor: WebGLUniformLocation | null;
  secondaryColor: WebGLUniformLocation | null;
};

const webGlVertexShader = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const webGlFragmentShader = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 out_color;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_intensity;
uniform float u_pointer_strength;
uniform float u_distortion;
uniform vec3 u_primary_color;
uniform vec3 u_secondary_color;

float softCircle(vec2 point, vec2 center, float radius, float feather) {
  return 1.0 - smoothstep(radius - feather, radius + feather, distance(point, center));
}

void main() {
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 delta = (uv - u_pointer) * aspect;
  float distance_to_pointer = length(delta);
  float wave = sin(distance_to_pointer * 42.0 - u_time * 2.2) * exp(-distance_to_pointer * 8.0);
  float field = softCircle(uv * aspect, u_pointer * aspect, 0.18 + u_distortion * 0.05, 0.14);
  float gesture = clamp(field * u_pointer_strength + wave * u_distortion * 0.35, 0.0, 1.0);
  vec3 color = mix(u_secondary_color, u_primary_color, gesture * u_intensity);
  out_color = vec4(color, 1.0);
}`;

const webGpuShader = `
struct Uniforms {
  resolution: vec2f,
  pointer: vec2f,
  time: f32,
  intensity: f32,
  pointer_strength: f32,
  distortion: f32,
  primary_color: vec4f,
  secondary_color: vec4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vertex_main(@builtin(vertex_index) index: u32) -> VertexOutput {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  var output: VertexOutput;
  let position = positions[index];
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = position * 0.5 + vec2f(0.5);
  return output;
}

fn soft_circle(point: vec2f, center: vec2f, radius: f32, feather: f32) -> f32 {
  return 1.0 - smoothstep(radius - feather, radius + feather, distance(point, center));
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  let uv = input.uv;
  let aspect = vec2f(uniforms.resolution.x / max(uniforms.resolution.y, 1.0), 1.0);
  let delta = (uv - uniforms.pointer) * aspect;
  let distance_to_pointer = length(delta);
  let wave = sin(distance_to_pointer * 42.0 - uniforms.time * 2.2) * exp(-distance_to_pointer * 8.0);
  let field = soft_circle(uv * aspect, uniforms.pointer * aspect, 0.18 + uniforms.distortion * 0.05, 0.14);
  let gesture = clamp(field * uniforms.pointer_strength + wave * uniforms.distortion * 0.35, 0.0, 1.0);
  let color = mix(uniforms.secondary_color.rgb, uniforms.primary_color.rgb, gesture * uniforms.intensity);
  return vec4f(color, 1.0);
}`;

const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const color = (value: unknown, fallback: string): [number, number, number] => {
  const resolved = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return [1, 3, 5].map((offset) => Number.parseInt(resolved.slice(offset, offset + 2), 16) / 255) as [number, number, number];
};

const createState = (initial: Readonly<ReferenceSceneConfig>) => {
  let pointer: [number, number] = [0.5, 0.5];
  let config: ResolvedConfig = {
    intensity: 1,
    pointerStrength: 0.8,
    distortion: 0.5,
    primaryColor: '#cd0208',
    secondaryColor: '#f1efef'
  };
  const update = (next: Readonly<ReferenceSceneConfig>) => {
    config = {
      intensity: bounded(next.intensity, config.intensity, 0.2, 3),
      pointerStrength: bounded(next.pointerStrength, config.pointerStrength, 0, 2),
      distortion: bounded(next.distortion, config.distortion, 0, 1.5),
      primaryColor: typeof next.primaryColor === 'string' ? next.primaryColor : config.primaryColor,
      secondaryColor: typeof next.secondaryColor === 'string' ? next.secondaryColor : config.secondaryColor
    };
  };
  update(initial);
  return {
    get config() { return config; },
    get pointer() { return pointer; },
    update,
    pointerInput(input: ScenePointerInput) {
      pointer = [(input.normalizedX + 1) * 0.5, 1 - (input.normalizedY + 1) * 0.5];
    }
  };
};

const compileShader = (gl: WebGL2RenderingContext, kind: number, source: string) => {
  const shader = gl.createShader(kind);
  if (!shader) throw new Error('WebGL shader allocation failed.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'WebGL shader compilation failed.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
};

const createProgram = (gl: WebGL2RenderingContext) => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, webGlVertexShader);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, webGlFragmentShader);
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL program allocation failed.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'WebGL program linking failed.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
};

const createReferenceScene = (manifest: InteractiveSceneRuntimeManifest) => defineGpuScene<ReferenceSceneConfig>({
  manifest,
  powerPreference: 'high-performance',
  webgpu: {
    async prepare({canvas, device, format, config}) {
      const state = createState(config);
      const resources = createGpuResourceTracker();
      const uniformData = new Float32Array(16);
      const shader = device.createShaderModule({code: webGpuShader});
      const pipeline = await device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: {module: shader, entryPoint: 'vertex_main'},
        fragment: {module: shader, entryPoint: 'fragment_main', targets: [{format}]},
        primitive: {topology: 'triangle-list'}
      }) as NativeGpuRenderPipeline;
      const uniformBuffer = resources.track(device.createBuffer({size: uniformData.byteLength, usage: 0x40 | 0x08}));
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{binding: 0, resource: {buffer: uniformBuffer}}]
      }) as NativeGpuBindGroup;
      let gpuContext: NativeGpuCanvasContext | null = null;
      return {
        activate(context) { gpuContext = context; },
        update: state.update,
        pointer: state.pointerInput,
        frame(frame) {
          if (!gpuContext) return;
          const primary = color(state.config.primaryColor, '#cd0208');
          const secondary = color(state.config.secondaryColor, '#f1efef');
          uniformData.set([
            canvas.width, canvas.height,
            state.pointer[0], state.pointer[1],
            frame.time / 1000, state.config.intensity, state.config.pointerStrength, state.config.distortion,
            primary[0], primary[1], primary[2], 0,
            secondary[0], secondary[1], secondary[2], 0
          ]);
          device.queue.writeBuffer(uniformBuffer, 0, uniformData);
          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [{
              view: gpuContext.getCurrentTexture().createView(),
              clearValue: {r: secondary[0], g: secondary[1], b: secondary[2], a: 1},
              loadOp: 'clear',
              storeOp: 'store'
            }]
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(3);
          pass.end();
          device.queue.submit([encoder.finish()]);
        },
        dispose() {
          gpuContext = null;
          resources.dispose();
        }
      };
    }
  },
  webgl2: {
    setup({canvas, gl, config}) {
      const state = createState(config);
      const resources = createGpuResourceTracker();
      const program = createProgram(gl);
      const vertexArray = gl.createVertexArray();
      const vertexBuffer = gl.createBuffer();
      if (!vertexArray || !vertexBuffer) throw new Error('WebGL geometry allocation failed.');
      resources.track(() => gl.deleteProgram(program));
      resources.track(() => gl.deleteVertexArray(vertexArray));
      resources.track(() => gl.deleteBuffer(vertexBuffer));
      gl.bindVertexArray(vertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const uniforms: SceneUniforms = {
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        pointer: gl.getUniformLocation(program, 'u_pointer'),
        time: gl.getUniformLocation(program, 'u_time'),
        intensity: gl.getUniformLocation(program, 'u_intensity'),
        pointerStrength: gl.getUniformLocation(program, 'u_pointer_strength'),
        distortion: gl.getUniformLocation(program, 'u_distortion'),
        primaryColor: gl.getUniformLocation(program, 'u_primary_color'),
        secondaryColor: gl.getUniformLocation(program, 'u_secondary_color')
      };
      return {
        update: state.update,
        pointer: state.pointerInput,
        frame(frame) {
          const primary = color(state.config.primaryColor, '#cd0208');
          const secondary = color(state.config.secondaryColor, '#f1efef');
          gl.useProgram(program);
          gl.bindVertexArray(vertexArray);
          gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
          gl.uniform2f(uniforms.pointer, state.pointer[0], state.pointer[1]);
          gl.uniform1f(uniforms.time, frame.time / 1000);
          gl.uniform1f(uniforms.intensity, state.config.intensity);
          gl.uniform1f(uniforms.pointerStrength, state.config.pointerStrength);
          gl.uniform1f(uniforms.distortion, state.config.distortion);
          gl.uniform3f(uniforms.primaryColor, primary[0], primary[1], primary[2]);
          gl.uniform3f(uniforms.secondaryColor, secondary[0], secondary[1], secondary[2]);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        dispose: resources.dispose
      };
    }
  }
});

const runtimeManifest = Object.freeze({
  ...(runtimeManifestSource as InteractiveSceneRuntimeManifest),
  backend: 'auto'
} as const satisfies InteractiveSceneRuntimeManifest);

const webglManifest = Object.freeze({
  ...runtimeManifest,
  id: 'reference-scene-webgl2',
  backend: 'webgl2'
} as const satisfies InteractiveSceneRuntimeManifest);

export const referenceScene = createReferenceScene(runtimeManifest);
export const referenceSceneWebgl2 = createReferenceScene(webglManifest);
