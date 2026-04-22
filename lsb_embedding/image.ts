import { decodePNG } from "jsr:@img/png/decode";

export async function readPngBytesAsRGBA8(targetPngPath: string): Promise<RBGA8Image> {
  const bytes = await readPngBytes(targetPngPath);
  return await pngToRGBA8Representation(bytes);
}

async function readPngBytes(targetPngPath: string): Promise<Uint8Array<ArrayBuffer>> {
  return await Deno.readFile(targetPngPath);
}

export interface RBGA8Image {
  width: number;
  height: number;
  rgba8: Uint32Array<ArrayBuffer>
}

export const BYTES_IN_WORD = 4 as const;

async function pngToRGBA8Representation(pngBytes: Uint8Array<ArrayBuffer>): Promise<RBGA8Image> {
  const { header, body } = await decodePNG(pngBytes);

  if (body.length % 4 !== 0){ 
    throw new Error("decodePNG returned non-RGBA8 length");
  }

  const pixelCount = body.length / BYTES_IN_WORD;
  const pixelsUint32 = new Uint32Array(pixelCount);

  for (let index = 0, pixel = 0; pixel < pixelCount; pixel++, index += BYTES_IN_WORD) {
    const r = body[index + 0]!;
    const g = body[index + 1]!;
    const b = body[index + 2]!;
    const a = body[index + 3]!;
    
    // Note: in the word R is the lowest byte i.e. packed A B G R (numerically speaking)
    pixelsUint32[pixel] = (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;
  }

  return {
    width: header.width,
    height: header.height,
    rgba8: pixelsUint32,
  };
}