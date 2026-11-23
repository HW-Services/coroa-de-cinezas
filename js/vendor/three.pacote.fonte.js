// Pacote do Three.js r164 + addons, exposto como window.THREE (compatível com o código antigo r128)
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { LuminosityHighPassShader } from 'three/examples/jsm/shaders/LuminosityHighPassShader.js';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';

const THREE = Object.assign({}, T, {
  GLTFLoader, DRACOLoader, KTX2Loader, MeshoptDecoder, SkeletonUtils, BufferGeometryUtils,
  UnrealBloomPass, SMAAPass, FXAAShader, CopyShader, LuminosityHighPassShader, CCDIKSolver,
  // constantes removidas no r162 (antes da gestão de cor)
  LinearEncoding: 3000, sRGBEncoding: 3001,
});
// texture.encoding (r128) -> texture.colorSpace
if (!('encoding' in T.Texture.prototype)) Object.defineProperty(T.Texture.prototype, 'encoding', {
  get() { return this.colorSpace === T.SRGBColorSpace ? 3001 : 3000; },
  set(v) { this.colorSpace = v === 3001 ? T.SRGBColorSpace : T.NoColorSpace; },
});
// renderer.outputEncoding / physicallyCorrectLights (r128)
Object.defineProperty(T.WebGLRenderer.prototype, 'outputEncoding', {
  get() { return this.outputColorSpace === T.SRGBColorSpace ? 3001 : 3000; },
  set(v) { this.outputColorSpace = v === 3001 ? T.SRGBColorSpace : T.LinearSRGBColorSpace; },
});
Object.defineProperty(T.WebGLRenderer.prototype, 'physicallyCorrectLights', {
  get() { return !this.useLegacyLights; }, set(v) { this.useLegacyLights = !v; },
});
// mantém as cores como no r128 (o pós-processamento faz a própria correção gama)
T.ColorManagement.enabled = false;
THREE.REVISAO_PACOTE = T.REVISION;
window.THREE = THREE;
