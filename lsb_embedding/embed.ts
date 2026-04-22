import { encodePNG } from "jsr:@img/png/encode";
import { readPngBytesAsRGBA8, BYTES_IN_WORD } from "./image.ts";
import { makeSites } from "./sites.ts";
import {
  BITS_IN_BYTE,
  LSB_BIT_MASK,
  BIT_INDEX_BYTE_O, 
  BIT_INDEX_BYTE_1, 
  BIT_INDEX_BYTE_2,
  BIT_INDEX_BYTE_3,
} from "./bitUtils.ts"
import { channelShift, Channel } from './channel.ts';

import type { RBGA8Image } from "./image.ts";
import type { Site } from "./sites.ts";

async function main() {
  const {
    targetPngPath, 
    inputDataPath,
    outputDataPath,
    siteSeed,
    lsbsToUse
  } = parseArgs();

  const image = await readPngBytesAsRGBA8(targetPngPath);
  const { 
    height,
    width,
  } = image;

  const inputBits = await readInputDataAsExpandedBits(inputDataPath);

  const embedSites = makeSites({
    siteSeed,
    numberOfSites: inputBits.length,
    imageWidth: width,
    imageHeight: height,
  });

  embed({
    locations: embedSites,
    bits: inputBits,
    channels: [Channel.Blue],
    lsbsToUse,
    image,
  })
 
  await writePngFromUint32Pixels({
    outputPath: outputDataPath,
    image,
  })
}

function parseArgs() {
  if (Deno.args.length !== 5) {
    throw new Error("usage: deno embed.ts target.png input_data output.png siteseed lsbsTouse");
  }

  const [targetPngPath, inputDataPath, outputDataPath, siteSeed, lsbsToUse] = Deno.args;

  return {
    targetPngPath, 
    inputDataPath, 
    outputDataPath,
    siteSeed: Number(siteSeed),
    lsbsToUse: Number(lsbsToUse)
  };
}

// Store it as Uint8Array but each byte only has 1 bit
async function readInputDataAsExpandedBits(inputDataPath: string): Promise<Uint8Array<ArrayBuffer>> {
  const inputBytes = await Deno.readFile(inputDataPath);
  const bits = new Uint8Array(inputBytes.length * BITS_IN_BYTE);
  let bitCounter = 0;

  // Read Left to Right (Most Significant Bit) as we Conver to Bits
  for (const byte of inputBytes) {
    // bit[approriateIndex] = (Byte Shifted to the End) and Apply Mask to give me just the value of htee last Bit
    bits[bitCounter++] = (byte >> 7) & LSB_BIT_MASK;
    bits[bitCounter++] = (byte >> 6) & LSB_BIT_MASK;
    bits[bitCounter++] = (byte >> 5) & LSB_BIT_MASK;
    bits[bitCounter++] = (byte >> 4) & LSB_BIT_MASK;
    bits[bitCounter++] = (byte >> 3) & LSB_BIT_MASK;
    bits[bitCounter++] = (byte >> 2) & LSB_BIT_MASK;
    bits[bitCounter++] = (byte >> 1) & LSB_BIT_MASK;
    bits[bitCounter++] = (byte >> 0) & LSB_BIT_MASK;
  }

  return bits;
}

/*

L // Set of (x,y) Locations  to embed
B // Set of Bits to Embed
C // Channels to embed in i.e. R, G, B
N // Number of Significant Bits to use
P // Image in RBGA8 Format

fn EmbedLSB(L, B, C, N, P):
   CAP := CalculateCapacity (P, C, N)
   if SizeOf(B) > SizeOf(CAP) OR
      SizeOf(B) != SizeOf(L):
       return Error
    for [X,Y] in L:
       J := Y*Width(P)+X
       PIX := P[J]
       BIT := Next(B)
       Embed(BIT, C, N, PIX)
*/

interface EmbedArgs {
  locations: Site[],
  bits: Uint8Array,
  channels: Channel[],
  lsbsToUse: number,
  image: RBGA8Image,
}

function embed(args: EmbedArgs): void {
  const {
    locations,
    bits,
    channels,
    lsbsToUse,
    image: {
      width,
      rgba8: pixels
    },
  } = args;

  // @TODO - Support Spreading Data Across Mulitple Channels
  if (channels.length > 1) {
    throw new Error("multiple channels unsupported right now");
  }
  // @TODO - Support Spreading Data Across Mulitple LSBs
  if (lsbsToUse > 1) {
    throw new Error("multiple lsb packing unsupported right now");
  }

  const capacity = calculateCapacity({
    pixelCount: pixels.length,
    channelsCount: channels.length,
    lsbsToUse
  });

  if (bits.length > capacity) {
    throw new Error(`bits (${bits.length}) exceed capacity (${capacity})`);
  }
  if (bits.length !== locations.length) {
    throw new Error(`bits (${bits.length}) must equal locations (${locations.length})`);
  }

  const channelIndex = channelShift(channels[0]);
  const channelMask = LSB_BIT_MASK << channelIndex;

  for (const [index, {x, y}] of locations.entries()) {
    const bit = bits[index];
    const pixelIndex = y * width + x;
    const pixel = pixels[pixelIndex];;

    // NOTE: We Mutate Data
    pixels[pixelIndex] = ((pixel & ~channelMask) | (bit << channelIndex)) >>> 0;
  }
}



interface CalculateCapacityArgs { 
  pixelCount: number,
  channelsCount: number,
  lsbsToUse:number
}

function calculateCapacity(args: CalculateCapacityArgs): number {
  const {
    pixelCount,
    channelsCount,
    lsbsToUse
  } = args;

  if (lsbsToUse <= 0 || lsbsToUse > 8) {
    throw new Error("lsbsToUse must be 1..8");
  }

  if (channelsCount === 0) {
    throw new Error("channels cannot be empty");
  }

  return pixelCount * channelsCount * lsbsToUse;
}

const BYTE_MASK = 0xFF as const;

interface WriteArgs {
  outputPath: string,
  image: RBGA8Image 
};

async function writePngFromUint32Pixels(args: WriteArgs): Promise<void> {
  const {
    outputPath: outpath,
    image: {
      width,
      height,
      rgba8: pixels
    },
  } = args;

  const rgba8Bytes = new Uint8Array(pixels.length * BYTES_IN_WORD);
  for (let index = 0, outputIndex = 0; index < pixels.length; index++, outputIndex += BYTES_IN_WORD) {
    const pixel = pixels[index]!;
    rgba8Bytes[outputIndex + 0] = (pixel >>> BIT_INDEX_BYTE_O) & BYTE_MASK; // R
    rgba8Bytes[outputIndex + 1] = (pixel >>> BIT_INDEX_BYTE_1) & BYTE_MASK; // G 
    rgba8Bytes[outputIndex + 2] = (pixel >>> BIT_INDEX_BYTE_2) & BYTE_MASK; // B
    rgba8Bytes[outputIndex + 3] = (pixel >>> BIT_INDEX_BYTE_3) & BYTE_MASK; // A
  }

  const pngBytes = await encodePNG(rgba8Bytes, {
    width,
    height,
    compression: 0,
    filter: 0,
    interlace: 0,
  });

  await Deno.writeFile(outpath, pngBytes);
}

// Run the Actual Program
await main();

