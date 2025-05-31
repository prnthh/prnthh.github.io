import { useTexture } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Helper function to create a range of numbers
const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i)

const helpers =/* glsl */ `
  float sdfSquare(vec2 uv, vec2 size, vec2 offset) {
    vec2 d = abs(uv - offset) - size;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
`

const params =/* glsl */ `
  uniform vec3 uPlanePosition;
  uniform mat3 uPlaneRotation;
  uniform float room_size;
  uniform float room_depth;
  uniform sampler2D cubemap_albedo;
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  uniform sampler2D texture3;
  uniform float emission_strength;

  varying vec3 obj_vertex;
  varying vec3 obj_cam;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vBitangent;
`

const interiorCubeMap = {
    vertexShader:/* glsl */ `
    ${params}

    void main() {
      if (room_depth != 0.) {
        vec2 d = vec2(room_size, room_size) / 2.;
        vec3 delta = vec3(d.x, d.y, 0.);

        obj_vertex = position - delta;
        obj_cam = inverse(modelViewMatrix)[3].xyz - delta;
      }

      // Transform normal, tangent, and bitangent to world space
      vNormal = normalize(normalMatrix * normal);
      
      // Compute tangent and bitangent for a plane
      vec3 tangent = vec3(1.0, 0.0, 0.0); // Align with UV.x
      vec3 bitangent = vec3(0.0, 1.0, 0.0); // Align with UV.y
      vTangent = normalize(normalMatrix * tangent);
      vBitangent = normalize(normalMatrix * bitangent);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vUv = uv;
    }
  `,
    fragmentShader:/* glsl */ `
    ${params}

    ${helpers}

    float remap_range(float value, float min_in, float max_in, float min_out, float max_out) {
      return (value - min_in) / (max_in - min_in) * (max_out - min_out) + min_out;
    }

    vec3 sample_cubemap(sampler2D cubemap, vec2 uv, vec3 face) {
      face = normalize(face);

      if (face.x == 1.) {
        uv.x = remap_range(uv.x, 0., 1., 0., 1./3.);
        uv.y = remap_range(uv.y, 0., 1., 0., 1./2.);
      }
      else if (face.x == -1.) {
        uv.x = remap_range(uv.x, 0., 1., 0., 1./3.);
        uv.y = remap_range(uv.y, 0., 1., 1./2., 1.);
      }
      else if (face.y == 1.) {
        uv.x = remap_range(uv.x, 0., 1., 1./3., 2./3.);
        uv.y = remap_range(uv.y, 0., 1., 0., 1./2.);
      }
      else if (face.y == -1.) {
        uv.x = remap_range(uv.x, 0., 1., 1./3., 2./3.);
        uv.y = remap_range(uv.y, 0., 1., 1./2., 1.);
      }
      else if (face.z == 1.) {
        uv.x = remap_range(uv.x, 0., 1., 2./3., 1.);
        uv.y = remap_range(uv.y, 0., 1., 0., 1./2.);
      }
      else if (face.z == -1.) {
        uv.x = remap_range(uv.x, 0., 1., 2./3., 1.);
        uv.y = remap_range(uv.y, 0., 1., 1./2., 1.);
      }

      return texture(cubemap, uv).rgb;
    }

    void main() {
      vec4 color = vec4(0.0);
      
      /* Cube Mapping */
      vec3 cm_face = vec3(0., 0., 1.);
      vec2 cm_uv = vUv;
      
      float depth = room_depth * 2.;
      vec3 cam2pix = obj_vertex - obj_cam;
      
      float is_floor = step(cam2pix.z, 0.);
      float ceil_y = ceil(obj_vertex.z / depth - is_floor) * depth;
      float ceil_t = (ceil_y - obj_cam.z) / cam2pix.z;
      
      float is_north = step(cam2pix.y, 0.);
      float wall_f_z = ceil(obj_vertex.y / room_size - is_north) * room_size;
      float wall_f_t = (wall_f_z - obj_cam.y) / cam2pix.y;
      
      float is_east = step(cam2pix.x, 0.);
      float wall_e_z = ceil(obj_vertex.x / room_size - is_east) * room_size;
      float wall_e_t = (wall_e_z - obj_cam.x) / cam2pix.x;
      
      vec2 tex_coord;
      float min_t = min(min(ceil_t, wall_e_t), wall_f_t);
      
      if (wall_e_t == min_t) {
        tex_coord = obj_cam.zy + wall_e_t * cam2pix.zy;
        cm_face = vec3((is_east == 0.) ? 1. : -1., 0., 0.);
      }
      else if (wall_f_t == min_t) {
        tex_coord = obj_cam.xz + wall_f_t * cam2pix.xz;
        cm_face = vec3(0., (is_north == 0.) ? -1. : 1., 0.);
      }
      else if (ceil_t == min_t) {
        tex_coord = obj_cam.xy + ceil_t * cam2pix.xy;
        cm_face = vec3(0., 0., (is_floor == 0.) ? 1. : -1.);
      }

      if (!(ceil_t == min_t)) {
        tex_coord.y /= room_depth;
      }

      cm_uv = (tex_coord * 0.5 + 1.);
      cm_uv.x = clamp(cm_uv.x, 0., 1.);
      cm_uv.y = clamp(cm_uv.y, 0., 1.);
      
      color = vec4(sample_cubemap(cubemap_albedo, cm_uv, cm_face), 1.0);

      /* Parallax */
      vec2 parallaxUv = vUv - 0.5;

      // Compute view direction in world space
      vec3 viewDir = normalize(cameraPosition - uPlanePosition);

      // Transform view direction to the plane's local space using uPlaneRotation
      vec3 viewDirTS = uPlaneRotation * viewDir;

      // Normal in tangent space (facing forward in local space)
      vec3 normalTS = vec3(0.0, 0.0, 1.0);

      // Compute facing coefficient (clamp to avoid extremes)
      float facingCoefficient = max(dot(viewDirTS, normalTS), 0.2); // Avoid division by zero

      // Compute perspective offset with increased scaling for visibility
      vec3 perspective = viewDirTS / facingCoefficient;

      // Depth distances for each layer
      float depthDist1 = 0.0; // Front layer (texture1)
      float depthDist2 = 0.5; // Middle layer (texture2)
      float depthDist3 = 1.0; // Back layer (texture3)

      // Apply constrained offsets
      vec2 offset1 = depthDist1 * perspective.xy;
      vec2 offset2 = depthDist2 * perspective.xy;
      vec2 offset3 = depthDist3 * perspective.xy;

      // Define square size (slightly smaller than plane to allow movement)
      vec2 squareSize = vec2(room_size * 0.25, room_size * 0.25); // Reduced to 80% of plane size

      // Compute SDF for each square layer
      float shape1 = sdfSquare(parallaxUv, squareSize, offset1);
      float shape2 = sdfSquare(parallaxUv, squareSize, offset2);
      float shape3 = sdfSquare(parallaxUv, squareSize, offset3);

      // Blend textures from back to front with alpha support
      // Back layer (texture3)
      vec2 texUv3 = (parallaxUv - offset3 + squareSize) / (2.0 * squareSize); // Map to [0, 1]
      texUv3 = clamp(texUv3, 0.0, 1.0); // Prevent texture bleeding
      vec4 texColor3 = texture2D(texture3, texUv3);
      float mask3 = 1.0 - step(0., shape3); // 1 inside, 0 outside
      color.rgb = mix(color.rgb, texColor3.rgb, texColor3.a * mask3);
      color.a = mix(color.a, 1.0, texColor3.a * mask3);

      // Middle layer (texture2)
      vec2 texUv2 = (parallaxUv - offset2 + squareSize) / (2.0 * squareSize);
      texUv2 = clamp(texUv2, 0.0, 1.0);
      vec4 texColor2 = texture2D(texture2, texUv2);
      float mask2 = 1.0 - step(0., shape2);
      color.rgb = mix(color.rgb, texColor2.rgb, texColor2.a * mask2);
      color.a = mix(color.a, 1.0, texColor2.a * mask2);

      // Front layer (texture1)
      vec2 texUv1 = (parallaxUv - offset1 + squareSize) / (2.0 * squareSize);
      texUv1 = clamp(texUv1, 0.0, 1.0);
      vec4 texColor1 = texture2D(texture1, texUv1);
      float mask1 = 1.0 - step(0., shape1);
      color.rgb = mix(color.rgb, texColor1.rgb, texColor1.a * mask1);
      color.a = mix(color.a, 1.0, texColor1.a * mask1);

      gl_FragColor = color;
    }
  `
}

const Window = ({ size = [2, 2, 1], position = [0, 1, 5], rotation = [0, -Math.PI, 0] }: {
    size?: [number, number, number],
    position?: [number, number, number],
    rotation?: [number, number, number],
}) => {
    // Load textures
    const meshRef = useRef<THREE.Mesh | null>(null)
    const [worldPosition, setWorldPosition] = useState([0, 0, 0])
    const cubemap_albedo = useTexture('/textures/cubemap-faces.png')
    const texture1 = useTexture('/textures/image1.png') // Front layer
    const texture2 = useTexture('/textures/image2.png') // Middle layer
    const texture3 = useTexture('/textures/image3.png') // Back layer

    // Compute the rotation matrix from Euler angles (X, Y, Z)
    const cosX = Math.cos(rotation[0]), sinX = Math.sin(rotation[0]);
    const cosY = Math.cos(rotation[1]), sinY = Math.sin(rotation[1]);
    const cosZ = Math.cos(rotation[2]), sinZ = Math.sin(rotation[2]);

    const rotationMatrix = [
        cosY * cosZ,
        sinX * sinY * cosZ - cosX * sinZ,
        cosX * sinY * cosZ + sinX * sinZ,
        cosY * sinZ,
        sinX * sinY * sinZ + cosX * cosZ,
        cosX * sinY * sinZ - sinX * cosZ,
        -sinY,
        sinX * cosY,
        cosX * cosY
    ];
    useEffect(() => {
        if (meshRef.current) {
            const pos = meshRef.current.getWorldPosition(new THREE.Vector3());
            setWorldPosition([pos.x, pos.y, pos.z]);
        }
    }, [meshRef.current])

    return (
        <mesh ref={meshRef} position={position} rotation={rotation}>
            <planeGeometry args={size} />
            <shaderMaterial
                uniforms={{
                    uPlanePosition: { value: worldPosition },
                    uPlaneRotation: { value: rotationMatrix },
                    room_size: { value: size[0] }, // Assuming square plane (width = height)
                    cubemap_albedo: { value: cubemap_albedo },
                    room_depth: { value: size[2] },
                    emission_strength: { value: 1.0 },
                    texture1: { value: texture1 },
                    texture2: { value: texture2 },
                    texture3: { value: texture3 },
                }}
                vertexShader={interiorCubeMap.vertexShader}
                fragmentShader={interiorCubeMap.fragmentShader}
                transparent={true} // Enable transparency in the material
            />
        </mesh>
    )
}

const WindowsInCircle = ({ position, count = 8, radius = 5 }: { position: [number, number, number], count?: number, radius?: number }) => {
    return (
        <group position={position}>
            {range(0, count).map((i) => {
                const angle = (i / count) * Math.PI * 2
                const x = Math.cos(angle) * radius
                const z = Math.sin(angle) * radius

                return <Window key={i} position={[x, 1, z]} rotation={[0, -angle - Math.PI / 2, 0]} />
            })}
        </group>
    )
}

export default Window