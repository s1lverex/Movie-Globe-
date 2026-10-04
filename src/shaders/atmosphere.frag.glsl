// Fresnel rim glow rendered on the back faces of a slightly larger sphere.
// Brightest at the Earth's limb, fading to zero at the outer silhouette.
uniform vec3 glowColor;
uniform vec3 sunDir;
uniform float intensity;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 N = normalize(vNormalW);
  float d = clamp(-dot(N, V) / 0.5, 0.0, 1.0);
  float rim = pow(d, 2.6);
  float sunFacing = 0.5 + 0.5 * smoothstep(-0.4, 0.6, dot(N, normalize(sunDir)));
  gl_FragColor = vec4(glowColor * rim * intensity * sunFacing, rim);
  #include <colorspace_fragment>
}
