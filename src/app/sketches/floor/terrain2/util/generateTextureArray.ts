import { DataArrayTexture, RGBAFormat, UnsignedByteType, LinearMipMapLinearFilter, LinearFilter, NearestFilter, RepeatWrapping, SRGBColorSpace } from "three";
import { getImageData } from "./getImageData";
import type { Texture } from "three";

export function generateTextureArray(textures: (Texture | undefined)[], encoding: any = SRGBColorSpace) {
  const filteredTextures = textures.filter((t): t is Texture => t !== undefined);
  const { width, height } = filteredTextures[0].image; // assume all textures are the same size
  const texturesData = new Uint8Array(width * height * 4 * filteredTextures.length);

  // for each texture in the textures array
  filteredTextures.forEach((texture, i) => {
    const data = getImageData(texture.image).data;
    // if(typeof alphaTexture != 'undefined') {
    //   // const alpha = getImageData(alphaTexture?.image);
    //   console.log(texture.image, alphaTexture?);
    // }
    
    const offset = i * width * height * 4;
    texturesData.set(data, offset);
  });

  const textureArray = new DataArrayTexture(
    texturesData,
    width,
    height,
    filteredTextures.length
  );

  // set the mips and such
  textureArray.needsUpdate = true;
  textureArray.format = RGBAFormat;
  textureArray.colorSpace = encoding;
  textureArray.type = UnsignedByteType;
  textureArray.minFilter = LinearMipMapLinearFilter;
  textureArray.magFilter = NearestFilter;
  textureArray.wrapS = RepeatWrapping;
  textureArray.wrapT = RepeatWrapping;
  textureArray.generateMipmaps = true;

  return textureArray;
}

const TextureIds = (textures: (Texture | undefined)[]) => textures.filter((d): d is Texture => d !== undefined).map((d) => d.uuid).join('-');

const memory = (function TexMem(){
  let cache: { [key: string]: any } = {};
  return {
    get: (textures: (Texture | undefined)[]) => cache[TextureIds(textures)],
    set: (textures: (Texture | undefined)[], value: any) => cache[TextureIds(textures)] = value,
    clear: () => cache = {},
    "delete": (textures: (Texture | undefined)[]) => delete cache[TextureIds(textures)]
  }
})();

export function memGenerateTextureArray(textures: (Texture | undefined)[], encoding?: number){
  if(memory.get(textures)) return memory.get(textures);
  const textureArray = generateTextureArray(textures, encoding);
  memory.set(textures, textureArray);
  return textureArray;
};