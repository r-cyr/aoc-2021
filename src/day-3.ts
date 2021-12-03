import * as T from "@effect-ts/core/Effect";
import * as STR from "@effect-ts/core/String";
import * as M from "@effect-ts/core/Effect/Managed";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import * as SK from "@effect-ts/core/Effect/Experimental/Stream/Sink";
import { pipe } from "@effect-ts/core/Function";
import {
  generateBitMask,
  printResults,
  readFileAsStream,
  toBinary,
} from "./utils";

const BIT_ARRAY_SIZE = 12;
type BIT_ARRAY_SIZE = typeof BIT_ARRAY_SIZE;

type BIT_ARRAY<N, T extends unknown[] = []> = T["length"] extends N
  ? T
  : BIT_ARRAY<N, [...T, number]>;

const emptyBitArray = <N extends number>(n: N): BIT_ARRAY<N> =>
  Array.from({ length: n }, () => 0) as BIT_ARRAY<N>;

const binaryStream = pipe(
  readFileAsStream("./inputs/day-3.txt"),
  S.splitLines,
  S.map((bits) => Array.from(bits, Number) as BIT_ARRAY<BIT_ARRAY_SIZE>)
);

type RatingType = "highest" | "lowest";

function findRating<R, E>(
  stream: S.Stream<R, E, BIT_ARRAY<BIT_ARRAY_SIZE>>,
  type: RatingType,
  pos = 0
): S.Stream<R, E | Error, BIT_ARRAY<BIT_ARRAY_SIZE>> {
  if (pos === BIT_ARRAY_SIZE) {
    return stream;
  }

  return S.unwrapManaged(
    M.gen(function* (_) {
      const {
        tuple: [oneStream, zeroStream],
      } = yield* _(S.partition_(stream, (bits) => !!bits[pos]!));

      const {
        tuple: [
          {
            tuple: [zeros, numberOfZeros],
          },
          {
            tuple: [ones, numberOfOnes],
          },
        ],
      } = yield* _(
        T.zipPar_(
          pipe(
            zeroStream,
            S.run(
              SK.zipPar_(
                SK.collectAll<any, BIT_ARRAY<BIT_ARRAY_SIZE>>(),
                SK.count()
              )
            )
          ),
          pipe(
            oneStream,
            S.run(
              SK.zipPar_(
                SK.collectAll<any, BIT_ARRAY<BIT_ARRAY_SIZE>>(),
                SK.count()
              )
            )
          )
        )
      );

      if (type === "lowest") {
        const elems = numberOfOnes >= numberOfZeros ? zeros : ones;

        if (CK.size(elems) === 1) {
          return S.fromChunk(elems);
        } else {
          return findRating(S.fromChunk(elems), type, pos + 1);
        }
      } else {
        const elems = numberOfOnes >= numberOfZeros ? ones : zeros;
        if (CK.size(elems) === 1) {
          return S.fromChunk(elems);
        } else {
          return findRating(S.fromChunk(elems), type, pos + 1);
        }
      }
    })
  ) as S.Stream<R, E | Error, BIT_ARRAY<BIT_ARRAY_SIZE>>;
}

function findOxygenGeneratorRating<R, E>(
  stream: S.Stream<R, E, BIT_ARRAY<BIT_ARRAY_SIZE>>
) {
  return pipe(
    findRating(stream, "highest"),
    S.runHead,
    T.some,
    T.map((_) => toBinary(AR.map_(_, STR.fromNumber).join("")))
  );
}

function findCO2ScrubberRating<R, E>(
  stream: S.Stream<R, E, BIT_ARRAY<BIT_ARRAY_SIZE>>
) {
  return pipe(
    findRating(stream, "lowest"),
    S.runHead,
    T.some,
    T.map((_) => toBinary(AR.map_(_, STR.fromNumber).join("")))
  );
}

const part1 = pipe(
  binaryStream,
  S.run(
    SK.zipPar_(
      SK.reduce(
        emptyBitArray(BIT_ARRAY_SIZE),
        () => true,
        (bits, newBits: BIT_ARRAY<BIT_ARRAY_SIZE>) =>
          AR.zipWith_(
            bits,
            newBits,
            (a, b) => a + b
          ) as BIT_ARRAY<BIT_ARRAY_SIZE>
      ),
      SK.count()
    )
  ),
  T.map(({ tuple: [bits, nbEntries] }) => {
    const gamma = toBinary(
      AR.map_(bits, (bit) => (bit >= nbEntries / 2 ? "1" : "0")).join("")
    );
    const epsilon = ~gamma & generateBitMask(BIT_ARRAY_SIZE);

    return gamma * epsilon;
  })
);

const part2 = T.zipWithPar_(
  findOxygenGeneratorRating(binaryStream),
  findCO2ScrubberRating(binaryStream),
  (o2, co2) => o2 * co2
);
printResults(3, part1, part2).catch(console.error);
