import { readPngBytesAsRGBA8 } from "./image.ts";
import { makeSites } from "./sites.ts";
import { channelShift, Channel } from './channel.ts';
import { BITS_IN_BYTE, LSB_BIT_MASK } from "./bitUtils.ts"

import type { RBGA8Image } from "./image.ts";
import type { Site } from "./sites.ts";

async function main() {
  const {
    imagePath, 
    outputPath,
    siteSeed,
    lsbsToUse,
  } = parseArgs();

  const image = await readPngBytesAsRGBA8(imagePath);
    const { 
    height,
    width,
  } = image;

  const SIZE_OF_SECRET = 136 as const;

  const embeddedSites = makeSites({
    siteSeed,
    // Note: You could package with a header so you can prase out as you read
    //       as opposed to having to know ahead of time
    numberOfSites: SIZE_OF_SECRET, 
    imageWidth: width,
    imageHeight: height,
  });

  const unpackedData = extract({
    locations: embeddedSites,
    channels: [Channel.Blue],
    lsbsToUse,
    image,
  });

  await writeUnpackedDataToFile({
    outputPath,
    bits: unpackedData
  });
}

function parseArgs() {
  if (Deno.args.length !== 4) {
    throw new Error("usage: deno run --allow-read extract.ts image.png outdata siteSeed lsbsToUse");
  }

  const [imagePath, outputPath, siteSeed, lsbsToUse] = Deno.args;

  return { 
    imagePath,
    outputPath,
    siteSeed: Number(siteSeed), 
    lsbsToUse: Number(lsbsToUse)
  };
}

/*
L // Set of (x,y) Locations  to embed
C // Channels to embed in i.e. R, G, B
N // Number of Significant Bits to use
P // Image in RBGA8 Format

fn ReadLSB(L, C, N, P):
    O := EmptySet(SizeOf(L))
    for [X,Y] in L:
       J := Y*Width(P)+X
       PIX := P[J]
       Append(O, Read(C, N, PIX))
    return O
*/

interface ExtractArgs {
  locations: Site[];
  channels: Channel[];
  lsbsToUse: number; 
  image: RBGA8Image;
}

function extract(args: ExtractArgs): Uint8Array {
  const {
    locations,
    channels,
    lsbsToUse,
    image: {
      width,
      rgba8: pixels
    },
  } = args;

  if (lsbsToUse !== 1) {
    throw new Error("lsbsToUse > 1 unsupported right now");
  } 

  const secret = new Uint8Array(locations.length);

  const channelIndex = channelShift(channels[0]);
  const channelMask = LSB_BIT_MASK << channelIndex;

  for (const [index, { x, y }] of locations.entries()) {
    const pixelIndex = y * width + x;
    const pixel = pixels[pixelIndex]!;
    secret[index] = (pixel & channelMask) ? 1 : 0;
  }

  return secret;
}

interface WriteArgs {
  outputPath: string,
  bits: Uint8Array
}

async function writeUnpackedDataToFile(args: WriteArgs): Promise<void> {
  const {
    bits,
    outputPath
  } = args;

  if (bits.length % BITS_IN_BYTE !== 0) {
    throw new Error(`bit length must be multiple of 8, got ${bits.length}`);
  }

  const outputBytes = new Uint8Array(bits.length / BITS_IN_BYTE);

  for (let index = 0, outputIndex = 0; index < bits.length; index += BITS_IN_BYTE, outputIndex++) {
    let byte = 0;
    byte |= (bits[index + 0]! & LSB_BIT_MASK) << 7;
    byte |= (bits[index + 1]! & LSB_BIT_MASK) << 6;
    byte |= (bits[index + 2]! & LSB_BIT_MASK) << 5;
    byte |= (bits[index + 3]! & LSB_BIT_MASK) << 4;
    byte |= (bits[index + 4]! & LSB_BIT_MASK) << 3;
    byte |= (bits[index + 5]! & LSB_BIT_MASK) << 2;
    byte |= (bits[index + 6]! & LSB_BIT_MASK) << 1;
    byte |= (bits[index + 7]! & LSB_BIT_MASK) << 0;
    outputBytes[outputIndex] = byte;
  }

  await Deno.writeFile(outputPath, outputBytes);
}

// Run the Actual Program
await main();