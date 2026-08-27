import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass, Effect } from 'postprocessing';

// shaders copied verbatim from the react bits dither component plain glsl

const waveVertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const waveFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;
uniform vec3 bgColor;
uniform vec2 mousePos;
uniform int enableMouseInteraction;
uniform float mouseRadius;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

const int OCTAVES = 4;
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 1.0;
  float freq = waveFrequency;
  for (int i = 0; i < OCTAVES; i++) {
    value += amp * abs(cnoise(p));
    p *= freq;
    amp *= waveAmplitude;
  }
  return value;
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  return fbm(p + fbm(p2));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  if (enableMouseInteraction == 1) {
    vec2 mouseNDC = (mousePos / resolution - 0.5) * vec2(1.0, -1.0);
    mouseNDC.x *= resolution.x / resolution.y;
    float dist = length(uv - mouseNDC);
    float effect = 1.0 - smoothstep(0.0, mouseRadius, dist);
    f -= 0.5 * effect;
  }
  vec3 col = mix(bgColor, waveColor, f);
  gl_FragColor = vec4(col, 1.0);
}
`;

const ditherFragmentShader = `
precision highp float;
uniform float colorNum;
uniform float pixelSize;
const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv * resolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  float bias = 0.2;
  color = clamp(color - bias, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void mainImage(in vec4 inputColor, in vec2 uv, out vec4 outputColor) {
  vec2 normalizedPixelSize = pixelSize / resolution;
  vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
  vec4 color = texture2D(inputBuffer, uvPixel);
  color.rgb = dither(uv, color.rgb);
  outputColor = color;
}
`;

// the dithering post process extends the postprocessing effect class
class RetroEffect extends Effect {
  constructor(colorNum = 4, pixelSize = 2) {
    super('RetroEffect', ditherFragmentShader, {
      uniforms: new Map<string, THREE.Uniform>([
        ['colorNum', new THREE.Uniform(colorNum)],
        ['pixelSize', new THREE.Uniform(pixelSize)]
      ])
    });
  }
}

@Component({
  selector: 'app-dither',
  standalone: true,
  // append the webgl canvas to this host element
  template: '',
  styleUrl: './dither.css'
})
export class Dither implements AfterViewInit, OnChanges, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() waveSpeed = 0.05;
  @Input() waveFrequency = 3;
  @Input() waveAmplitude = 0.3;
  @Input() waveColor: [number, number, number] = [0.5, 0.5, 0.5];
  @Input() bgColor: [number, number, number] = [0, 0, 0]; // the base the wave sits on
  @Input() colorNum = 4;
  @Input() pixelSize = 2;
  @Input() disableAnimation = false;
  @Input() enableMouseInteraction = true;
  @Input() mouseRadius = 1;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private composer!: EffectComposer;
  private material!: THREE.ShaderMaterial;
  private uniforms!: { [name: string]: THREE.IUniform };
  private readonly clock = new THREE.Clock();
  private readonly mouse = new THREE.Vector2();
  private frameId = 0;
  private resizeObs?: ResizeObserver;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1); // react bits forces dpr 1
    el.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // orthographic camera plus a 2x2 plane is a full screen quad shader runs in screen space
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.uniforms = {
      time: new THREE.Uniform(0),
      resolution: new THREE.Uniform(new THREE.Vector2(1, 1)),
      waveSpeed: new THREE.Uniform(this.waveSpeed),
      waveFrequency: new THREE.Uniform(this.waveFrequency),
      waveAmplitude: new THREE.Uniform(this.waveAmplitude),
      waveColor: new THREE.Uniform(new THREE.Color(this.waveColor[0], this.waveColor[1], this.waveColor[2])),
      bgColor: new THREE.Uniform(new THREE.Color(this.bgColor[0], this.bgColor[1], this.bgColor[2])),
      mousePos: new THREE.Uniform(new THREE.Vector2(0, 0)),
      enableMouseInteraction: new THREE.Uniform(this.enableMouseInteraction ? 1 : 0),
      mouseRadius: new THREE.Uniform(this.mouseRadius)
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: waveVertexShader,
      fragmentShader: waveFragmentShader,
      uniforms: this.uniforms
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));

    // render the waves then apply the dither effect
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new EffectPass(this.camera, new RetroEffect(this.colorNum, this.pixelSize)));

    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(el);

    if (this.enableMouseInteraction) {
      window.addEventListener('pointermove', this.onPointerMove);
    }

    this.animate();
  }

  // push input changes into the live uniforms guarded since inputs can change before setup
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.uniforms) return;
    if (changes['waveColor']) {
      (this.uniforms['waveColor'].value as THREE.Color).set(
        this.waveColor[0], this.waveColor[1], this.waveColor[2]
      );
    }
    if (changes['bgColor']) {
      (this.uniforms['bgColor'].value as THREE.Color).set(
        this.bgColor[0], this.bgColor[1], this.bgColor[2]
      );
    }
    if (changes['waveSpeed']) this.uniforms['waveSpeed'].value = this.waveSpeed;
    if (changes['waveFrequency']) this.uniforms['waveFrequency'].value = this.waveFrequency;
    if (changes['waveAmplitude']) this.uniforms['waveAmplitude'].value = this.waveAmplitude;
    if (changes['enableMouseInteraction']) {
      this.uniforms['enableMouseInteraction'].value = this.enableMouseInteraction ? 1 : 0;
    }
    if (changes['mouseRadius']) this.uniforms['mouseRadius'].value = this.mouseRadius;
  }

  private readonly resize = (): void => {
    const el = this.host.nativeElement;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    (this.uniforms['resolution'].value as THREE.Vector2).set(w, h);
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(e.clientX - rect.left, e.clientY - rect.top);
  };

  private readonly animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    if (!this.disableAnimation) {
      this.uniforms['time'].value = this.clock.getElapsedTime();
    }
    if (this.enableMouseInteraction) {
      (this.uniforms['mousePos'].value as THREE.Vector2).copy(this.mouse);
    }
    this.composer.render();
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObs?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    this.composer?.dispose();
    this.material?.dispose();
    this.renderer?.dispose();
  }
}
