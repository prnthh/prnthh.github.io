import * as THREE from 'three';
import { ImprovedNoise } from "three/examples/jsm/Addons.js";

export const generateTexture = (data: Uint8Array, width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    // Fill with black initially
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const imageData = image.data;
    
    const sun = new THREE.Vector3(1, 1, 1);
    sun.normalize();
    
    // Using Vector3 for normal calculation
    const vector3 = new THREE.Vector3(0, 0, 0);
    
    for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j++) {
        vector3.x = data[j - 2] - data[j + 2];
        vector3.y = 2;
        vector3.z = data[j - width * 2] - data[j + width * 2];
        vector3.normalize();
        
        const shade = vector3.dot(sun);
        
        // Match the exact color calculations from the demo
        imageData[i] = (96 + shade * 128) * (0.5 + data[j] * 0.007);
        imageData[i + 1] = (32 + shade * 96) * (0.5 + data[j] * 0.007);
        imageData[i + 2] = (shade * 96) * (0.5 + data[j] * 0.007);
        imageData[i + 3] = 255;
    }
    
    context.putImageData(image, 0, 0);
    
    // Create scaled 4x version
    const canvasScaled = document.createElement('canvas');
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;
    
    const scaledContext = canvasScaled.getContext('2d');
    if (scaledContext) {
        scaledContext.scale(4, 4);
        scaledContext.drawImage(canvas, 0, 0);
        
        const scaledImage = scaledContext.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
        const scaledData = scaledImage.data;
        
        // Add random variations for more natural look
        for (let i = 0, l = scaledData.length; i < l; i += 4) {
            const v = ~~(Math.random() * 5);
            scaledData[i] += v;
            scaledData[i + 1] += v;
            scaledData[i + 2] += v;
        }
        
        scaledContext.putImageData(scaledImage, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvasScaled);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        
        return texture;
    }
    
    // Fallback to original texture if scaling fails
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    
    return texture;
};


// Generate height data using Perlin noise
export const generateHeight = (width: number, height: number) => {
    const size = width * height;
    const data = new Uint8Array(size);
    const perlin = new ImprovedNoise();
    const z = Math.random() * 100;
    
    let quality = 1;
    
    for (let j = 0; j < 4; j++) {
        for (let i = 0; i < size; i++) {
            const x = i % width;
            const y = ~~(i / width); // ~~ is a faster Math.floor
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);
        }
        quality *= 5;
    }
    
    return data;
};