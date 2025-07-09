declare module '@mapbox/martini' {
    export default class Martini {
        constructor(gridSize: number);
        createTile(terrain: Float32Array): {
            getMesh(maxError: number): {
                vertices: Uint32Array;
                triangles: Uint32Array;
            };
        };
    }
}

// Minimal type definition for glslify
// glslify returns a string (the processed GLSL shader code)
declare module 'glslify' {
    function glslify(source: TemplateStringsArray, ...args: any[]): string;
    export = glslify;
}
