async function main() {
  console.log("Sampling 256 points of a 1024x720 space");
  let result = randomSamplingWithoutReplacement({
    xMax: 1024,
    yMax: 720,
    numberOfPairs: 256
  });
  console.table([...result]);
}

interface RandomSamplingArgs {
  xMax: number,
  yMax: number,
  numberOfPairs: number
}

interface Pair {
  x: number,
  y: number
}

/*
X_M // Maximum X-Value of our 2D space
Y_M // Maxmimum Y-Value of our 2D space
N   // Number of Pairs to Sample

fn RandomSample(X_M, Y_M, N): S
   M = X_M * Y_M
   S := EmptySet()
   U := EmptySet()
   for I := M - N; I < M; I++:
      C := NULL
      T := RandInt(0, I)
      if T is not in U:
        C = T
      else:
        C = I
      Insert(C, U)
      X := C % X_M
      Y := C // X_M
      Insert((X,Y), S)
   return S
*/

function randomSamplingWithoutReplacement(args: RandomSamplingArgs): Set<Pair> {
  const {
    xMax,
    yMax,
    numberOfPairs
  } = args;

  const samples = new Set<Pair>();
  if (numberOfPairs <= 0) {
    return samples;
  }

  const maxRange = xMax * yMax;
  const used = new Set<number>();
  for(let index = maxRange - numberOfPairs; index < maxRange; index++) {
    const randomSample = randomInteger(0, index);

    const selected = !used.has(randomSample) ? randomSample : index;
    used.add(selected);

    samples.add({
      x: selected % xMax,
      y: Math.floor(selected / xMax)
    });
  }

  return samples;
}

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Run the actual program
await main();