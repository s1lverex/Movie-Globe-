uniform sampler2D cloudMap;
uniform vec3 sunDir;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  float c = texture2D(cloudMap, vUv).r;
  float a = smoothstep(0.18, 0.95, c) * 0.85;
  float ndl = dot(normalize(vNormalW), normalize(sunDir));
  float light = 0.04 + 0.96 * smoothstep(-0.15, 0.35, ndl);
  gl_FragColor = vec4(vec3(light), a * (0.25 + 0.75 * light));
  #include <colorspace_fragment>
}
