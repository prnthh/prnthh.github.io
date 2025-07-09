import { useLoader, useThree } from "@react-three/fiber";
import { useEffect, useState, useRef, useMemo } from "react";
import { TextureLoader } from "three";
import { BasisTextureLoader, TGALoader } from "three-stdlib";

export default function useProgressiveTextures(resources: string[][]) {
  const { gl } = useThree();
  const [batch, setBatch] = useState(0);
  const loader = useMemo(() => new PolymorphicLoader(gl), [gl]);
  const initialTextures = useLoader(PolymorphicLoader, resources[0])
  const progressiveTextures = useRef<any[][]>([]);

  useEffect(() => {
    (async () => {
      const resourceSet = resources[batch + 1]
      if (!resourceSet) return

      const textures = await Promise.all(resourceSet.map(resource => {
        return loader.loadAsync(resource, undefined)
      }))

      progressiveTextures.current[batch] = textures
      if (batch < resources.length - 1) setBatch(batch + 1);

    })()
  }, [batch, loader, resources])

  // return progressiveTextures.current[0]
  return [batch, [initialTextures, ...(progressiveTextures.current)]]
}

export function useProgressiveTexture(resources: string[]) {
  const { gl } = useThree();
  const [batch, setBatch] = useState(0);
  const loader = useMemo(() => new PolymorphicLoader(gl), [gl]);
  const initialTexture = useLoader(PolymorphicLoader, resources[0]);
  const [progressiveTexture, setProgressiveTexture] = useState(initialTexture);

  useEffect(() => {
    loader.load(resources[batch], (texture: import("three").Texture) => {
      setProgressiveTexture(texture);
      if (batch < resources.length - 1) setBatch(batch + 1);
    });
  }, [batch, loader, resources]);

  return batch === 0 ? initialTexture : progressiveTexture
}

class PolymorphicLoader extends TextureLoader {

  gl: any;

  loaders: { [key in 'png' | 'jpg' | 'tga' | 'basis']: any } = {
    'png': TextureLoader,
    'jpg': TextureLoader,
    'tga': TGALoader,
    'basis': BasisTextureLoader
  }

  constructor(gl: any, ...args: any[]) {
    super(...args)
    if (gl) this.gl = gl
  }

  fileType(f: string) {
    return (f.split('.').pop() || '').toLowerCase();
  }

  load(input: string, ...rest: any[]) {
    const type = this.fileType(input)
    const loaderClass = this.loaders[type as keyof typeof this.loaders];
    const loader = new loaderClass();

    // note, basis textures requires gl and a transcoder to be setup beforehand
    if (type === "basis") {
      loader.setTranscoderPath("/");
      loader.detectSupport(this.gl);
    }
    return loader.load(input, ...rest);
  }

  async loadAsync(url: string, onProgress?: (event: ProgressEvent<EventTarget>) => void): Promise<import("three").Texture> {
    return new Promise<import("three").Texture>((resolve, reject) => {
      this.load(
        url,
        (texture: import("three").Texture) => resolve(texture),
        onProgress,
        (err: any) => reject(err)
      );
    });
  }
}