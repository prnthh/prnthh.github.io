import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

// Particle emitter configuration interface
interface EmitterConfig {
    position: [number, number, number];
    radius1?: number;
    radius2?: number;
    height?: number;
    emissionRate?: number;
    lifeTime?: [number, number];
    opacityDecrease?: number;
    rotationRange?: [number, number];
    speedRange?: [number, number];
    scaleStart?: number;
    scaleIncrease?: number;
    colorStart?: [number, number, number];
    colorEnd?: [number, number, number];
    colorSpeedRange?: [number, number];
    brightnessRange?: [number, number];
    opacity?: number;
    blend?: number;
    texture?: number;
    isFire?: boolean;
}

const SmokeAndFireSystem: React.FC<{
    emitters?: EmitterConfig[];
    wind?: [number, number, number];
}> = ({
    emitters = [],
    wind = [0.002, 0, 0],
}) => {
        const meshRef = useRef<THREE.Mesh | null>(null);
        const { clock, camera } = useThree();

        // Load textures (placeholders for actual texture paths)
        const textures = useTexture([
            '/textures/smoke.png',  // texture 0
            '/textures/fire.png',   // texture 1
            '/textures/grass.png',  // texture 2
            '/textures/spark.png',  // texture 3
        ]);

        // Vertex and fragment shaders from the example
        const vertexShader = `
    attribute vec3 offset;
    attribute vec2 scale;
    attribute vec4 quaternion;
    attribute float rotation;
    attribute vec4 color;
    attribute float blend;
    attribute float texture;
    uniform float time;
    varying vec2 vUv;
    varying vec4 vColor;
    varying float vBlend;
    varying float num;
    vec3 localUpVector=vec3(0.0,1.0,0.0);

    void main() {
      float angle = time * rotation;
      vec3 vRotated = vec3(
        position.x * scale.x * cos(angle) - position.y * scale.y * sin(angle),
        position.y * scale.y * cos(angle) + position.x * scale.x * sin(angle),
        position.z
      );

      vUv = uv;
      vColor = color;
      vBlend = blend;
      num = texture;

      vec3 vPosition;

      if (quaternion.w == 3.0) {
        vec3 vLook = normalize(offset - cameraPosition);
        vec3 vRight = normalize(cross(vLook, localUpVector));
        vec3 vUp = normalize(cross(vLook, vRight));
        vPosition = vRight * vRotated.x + vUp * vRotated.y + vLook * vRotated.z;
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition + offset, 1.0);
    }
  `;

        const fragmentShader = `
    const int count = 4;
    uniform sampler2D map[count];
    varying vec2 vUv;
    varying vec4 vColor;
    varying float vBlend;
    varying float num;

    void main() {
      float tex_num_2 = floor(num + 0.5);
      if (tex_num_2 == 0.0) { gl_FragColor = texture2D(map[0], vUv) * vColor; }
      else if (tex_num_2 == 1.0) { gl_FragColor = texture2D(map[1], vUv) * vColor; }
      else if (tex_num_2 == 2.0) { gl_FragColor = texture2D(map[2], vUv) * vColor; }
      else if (tex_num_2 == 3.0) { gl_FragColor = texture2D(map[3], vUv) * vColor; }

      gl_FragColor.rgb *= gl_FragColor.a;
      gl_FragColor.a *= vBlend;
    }
  `;

        // Particle geometry and material setup
        const geometry = useMemo(() => {
            const geom = new THREE.InstancedBufferGeometry();
            geom.setAttribute('position', new THREE.Float32BufferAttribute(
                [-0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0], 3
            ));
            geom.setAttribute('uv', new THREE.Float32BufferAttribute(
                [0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0], 2
            ));
            geom.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(), 3));
            geom.setAttribute('scale', new THREE.InstancedBufferAttribute(new Float32Array(), 2));
            geom.setAttribute('quaternion', new THREE.InstancedBufferAttribute(new Float32Array(), 4));
            geom.setAttribute('rotation', new THREE.InstancedBufferAttribute(new Float32Array(), 1));
            geom.setAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(), 4));
            geom.setAttribute('blend', new THREE.InstancedBufferAttribute(new Float32Array(), 1));
            geom.setAttribute('texture', new THREE.InstancedBufferAttribute(new Float32Array(), 1));
            return geom;
        }, []);

        const material = useMemo(() => new THREE.ShaderMaterial({
            uniforms: {
                map: { value: textures },
                time: { value: 0 },
            },
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
        }), [textures]);

        // Particle system state
        const particles = useRef<any[]>([]);
        const emitterState = useRef(emitters.map(em => ({
            ...em,
            position: { x: em.position[0], y: em.position[1], z: em.position[2] },
            elapsed: 0,
        })));

        // Particle emission function
        const emitParticle = (item: any) => {
            const radius1 = (item.radius1 || 0.02) * Math.sqrt(Math.random());
            const theta = 2 * Math.PI * Math.random();
            const x1 = item.position.x + radius1 * Math.cos(theta);
            const z1 = item.position.z + radius1 * Math.sin(theta);

            const radius2 = item.radius2 || 1;
            const x2 = x1 + radius2 * Math.cos(theta);
            const z2 = z1 + radius2 * Math.sin(theta);

            const dirX = x2 - x1;
            const dirY = item.height || 5;
            const dirZ = z2 - z1;

            const speed = Math.random() * ((item.speedRange?.[1] || 0.01) - (item.speedRange?.[0] || 0.005)) + (item.speedRange?.[0] || 0.005);
            const mag = 1 / Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) * speed;

            const brightness = Math.random() * ((item.brightnessRange?.[1] || 1) - (item.brightnessRange?.[0] || 1)) + (item.brightnessRange?.[0] || 1);

            particles.current.push({
                offset: [x1, item.position.y, z1],
                scale: [item.scaleStart || 0.2, item.scaleStart || 0.2],
                quaternion: [dirX * mag, dirY * mag, dirZ * mag, 3],
                rotation: Math.random() * ((item.rotationRange?.[1] || 1) - (item.rotationRange?.[0] || 0.5)) + (item.rotationRange?.[0] || 0.5),
                color: [1, 1, 1, item.opacity || 1],
                blend: item.blend || 0.8,
                texture: item.texture || (item.isFire ? 1 : 0),
                live: Math.random() * ((item.lifeTime?.[1] || 1.5) - (item.lifeTime?.[0] || 1)) + (item.lifeTime?.[0] || 1),
                scale_increase: item.scaleIncrease || 0.004,
                opacity_decrease: item.opacityDecrease || 0.008,
                color_from: [(item.colorStart?.[0] || 2) * brightness, (item.colorStart?.[1] || 2) * brightness, (item.colorStart?.[2] || 2) * brightness],
                color_to: [item.colorEnd?.[0] || 0, item.colorEnd?.[1] || 0, item.colorEnd?.[2] || 0],
                color_speed: Math.random() * ((item.colorSpeedRange?.[1] || 1) - (item.colorSpeedRange?.[0] || 1)) + (item.colorSpeedRange?.[0] || 1),
                color_pr: 0,
            });
        };

        // Update particles
        useFrame((state, delta) => {
            const time = clock.getElapsedTime();

            // Update emitters
            emitterState.current.forEach((item, i) => {
                item.elapsed += delta;
                let add = Math.floor(item.elapsed / (item.emissionRate || 0.1));
                item.elapsed -= add * (item.emissionRate || 0.1);
                while (add--) emitParticle(item);
            });

            // Update particles
            const alive: any[] = [];
            particles.current.forEach((item) => {
                if (item.color_pr < 1) {
                    const [r1, g1, b1] = item.color_from;
                    const [r2, g2, b2] = item.color_to;
                    item.color_pr += delta * item.color_speed;
                    item.color[0] = r1 + (r2 - r1) * item.color_pr;
                    item.color[1] = g1 + (g2 - g1) * item.color_pr;
                    item.color[2] = b1 + (b2 - b1) * item.color_pr;
                }

                item.offset[0] += item.quaternion[0] + wind[0];
                item.offset[1] += item.quaternion[1] + wind[1];
                item.offset[2] += item.quaternion[2] + wind[2];
                item.scale[0] += item.scale_increase;
                item.scale[1] += item.scale_increase;

                if (item.live > 0) {
                    item.live -= delta;
                } else {
                    item.color[3] -= item.opacity_decrease;
                }

                if (item.color[3] > 0) alive.push(item);
            });
            particles.current = alive;

            // Update geometry attributes
            const count = particles.current.length;
            const offset = new Float32Array(count * 3);
            const scale = new Float32Array(count * 2);
            const quaternion = new Float32Array(count * 4);
            const rotation = new Float32Array(count);
            const color = new Float32Array(count * 4);
            const blend = new Float32Array(count);
            const texture = new Float32Array(count);

            particles.current.forEach((item, n) => {
                offset.set(item.offset, n * 3);
                scale.set(item.scale, n * 2);
                quaternion.set(item.quaternion, n * 4);
                rotation[n] = item.rotation;
                color.set(item.color, n * 4);
                blend[n] = item.blend;
                texture[n] = item.texture;
            });

            const attrs = meshRef.current?.geometry.attributes;
            if (attrs && meshRef.current?.geometry instanceof THREE.InstancedBufferGeometry) {
                // Replace attributes instead of modifying read-only array property
                meshRef.current.geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offset, 3));
                meshRef.current.geometry.setAttribute('scale', new THREE.InstancedBufferAttribute(scale, 2));
                meshRef.current.geometry.setAttribute('quaternion', new THREE.InstancedBufferAttribute(quaternion, 4));
                meshRef.current.geometry.setAttribute('rotation', new THREE.InstancedBufferAttribute(rotation, 1));
                meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(color, 4));
                meshRef.current.geometry.setAttribute('blend', new THREE.InstancedBufferAttribute(blend, 1));
                meshRef.current.geometry.setAttribute('texture', new THREE.InstancedBufferAttribute(texture, 1));

                (meshRef.current.geometry as THREE.InstancedBufferGeometry).instanceCount = count;
            }

            if (meshRef.current?.material instanceof THREE.ShaderMaterial) {
                meshRef.current.material.uniforms.time.value = time;
            }
        });

        return (
            <mesh
                ref={meshRef}
                geometry={geometry}
                material={material}
                frustumCulled={false}
                matrixAutoUpdate={false}
            />
        );
    };

// Example usage
const ExampleScene: React.FC = () => {
    const emitters: EmitterConfig[] = [
        {
            position: [0, 1, 0],
            radius1: 0.02,
            radius2: 1,
            height: 5,
            emissionRate: 0.01,
            lifeTime: [1, 1.5],
            opacityDecrease: 0.008,
            rotationRange: [0.5, 1],
            speedRange: [0.005, 0.01],
            scaleStart: 0.2,
            scaleIncrease: 0.004,
            colorStart: [2, 2, 2],
            colorEnd: [0, 0, 0],
            colorSpeedRange: [1, 1],
            brightnessRange: [1, 1],
            opacity: 1,
            blend: 0.8,
            texture: 1, // Smoke
        },
        {
            position: [2, 1, 0],
            radius1: 0.02,
            radius2: 0.4,
            height: 5,
            emissionRate: 0.1,
            lifeTime: [4, 4.5],
            opacityDecrease: 0.004,
            rotationRange: [2, 3],
            speedRange: [0.005, 0.01],
            scaleStart: 0.1,
            scaleIncrease: 0.003,
            colorStart: [1, 0.5, 0.2],
            colorEnd: [1, 0.5, 0.2],
            colorSpeedRange: [1, 1],
            brightnessRange: [1, 1],
            opacity: 0.4,
            blend: 0.5,
            texture: 1, // Fire
            isFire: true,
        },
    ];

    return (
        <>
            <SmokeAndFireSystem emitters={emitters} />
            <mesh position={[0, -0.5, 0]}>
                <boxGeometry args={[20, 1, 20]} />
                <meshStandardMaterial map={useTexture('/textures/floor.png')} />
            </mesh>
        </>
    );
};

export default SmokeAndFireSystem;