// Day/night Earth: blends Blue Marble (day) and Black Marble (night lights)
// by the real-time sun direction, with bump-mapped relief, specular oceans
// and soft cloud shadows.
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D bumpMap;
uniform sampler2D specMap;
uniform sampler2D cloudMap;
uniform vec3 sunDir;
uniform float cloudOffset;
uniform float bumpScale;
uniform float cloudShadow;
uniform vec2 texel;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 east = cross(vec3(0.0, 1.0, 0.0), N);
  east = length(east) < 1e-4 ? vec3(1.0, 0.0, 0.0) : normalize(east);
  vec3 north = normalize(cross(N, east));

  float h = texture2D(bumpMap, vUv).r;
  float hx = texture2D(bumpMap, vUv + vec2(texel.x, 0.0)).r - h;
  float hy = texture2D(bumpMap, vUv + vec2(0.0, texel.y)).r - h;
  vec3 n = normalize(N - bumpScale * (hx * east + hy * north));

  vec3 L = normalize(sunDir);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndl = dot(n, L);
  float geomNdl = dot(N, L);

  vec3 day = texture2D(dayMap, vUv).rgb;
  vec3 night = texture2D(nightMap, vUv).rgb;

  float cloud = texture2D(cloudMap, vUv - vec2(cloudOffset, 0.0)).r;
  float shadow = 1.0 - cloudShadow * smoothstep(0.25, 0.9, cloud);

  float dayMix = smoothstep(-0.12, 0.22, geomNdl);
  vec3 lit = day * (0.06 + 1.05 * max(ndl, 0.0)) * shadow;

  float water = texture2D(specMap, vUv).r;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 48.0) * water * 0.55 * max(geomNdl, 0.0);
  lit += vec3(1.0, 0.95, 0.85) * spec * shadow;

  // City lights: warm, boosted for bloom, suppressed under thick cloud.
  vec3 lights = pow(night, vec3(1.6)) * vec3(1.6, 1.2, 0.7) * 2.2 * (1.0 - 0.6 * cloud);
  vec3 nightSide = day * 0.13 + vec3(0.006, 0.014, 0.04) + lights;

  vec3 color = mix(nightSide, lit, dayMix);

  // Warm scattering band along the terminator and blue limb haze.
  float term = exp(-pow(geomNdl * 7.0, 2.0));
  color += vec3(0.35, 0.14, 0.04) * term * 0.18;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  color += vec3(0.25, 0.5, 1.0) * fres * (0.25 + 0.6 * dayMix);

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
