import { randomIntegerBetween, randomSeeded } from "jsr:@std/random";

const SITES_SALT = 0x9F3A7C2B1D5E as const;
export type Site = {
  x: number;
  y: number;
}

interface makeSitesArgs {
  siteSeed: number;
  numberOfSites: number;
  imageWidth: number;
  imageHeight: number;
}

export function makeSites(args: makeSitesArgs): Site[] {
  const {
    siteSeed,
    numberOfSites,
    imageWidth,
    imageHeight
  } = args;

  if (numberOfSites <= 0) {
    throw new Error("Number of Sites was less than or equal to 0");
  }

  const prng = randomSeeded(BigInt(SITES_SALT ^ siteSeed)); 

  /*
   * Floyd Selection Algorithm
   * Ref: Programming Pearls https://dl.acm.org/doi/pdf/10.1145/30401.315746
   *    initialize set S to empty
   *    for J := N - M + 1 to N do
   *       T := RandInt(1, J)
   *       if T is not in S then
   *          insert T in S
   *       else
   *          insert J in S 
   */

  const maxRange = imageHeight*imageWidth;
  const used = new Set<number>();
  const sites: Site[] = [];

  for(let index = maxRange - numberOfSites; index < maxRange; index++) {
    const randomSample = randomIntegerBetween(0, index, { prng });
    const selected = used.has(randomSample) ? index : randomSample;
    used.add(selected);

    // You can leverage the Division in Number therory to take selected and make a unique guaranteed pair
    // And you can also prove (mathematically you'll never run off the end of the image)
    sites.push({
      // Yes, imageWidth both times 
      x: selected % imageWidth,
      y: Math.floor(selected / imageWidth)
    })
  }

  return sites;
}