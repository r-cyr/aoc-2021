import * as T from "@effect-ts/core/Effect";
import * as STR from "@effect-ts/core/String";
import * as O from "@effect-ts/core/Option";
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

type BitArray<N, T extends unknown[] = []> = T["length"] extends N
  ? T
  : BitArray<N, [...T, number]>;

function toBitArray<N extends number>(
  size: N,
  arr: AR.Array<number>
): O.Option<BitArray<N>> {
  return O.fromPredicate_(arr, (a): a is BitArray<N> => arr.length === size);
}

const binaryStream = pipe(
  readFileAsStream("./inputs/day-3.txt"),
  S.splitLines,
  S.map((bits) => toBitArray(BIT_ARRAY_SIZE, Array.from(bits, Number))),
  S.some
);

type RatingType = "highest" | "lowest";

function findRating<R, E>(
  stream: S.Stream<R, E, BitArray<BIT_ARRAY_SIZE>>,
  type: RatingType,
  pos = 0
): S.Stream<R, E | Error, BitArray<BIT_ARRAY_SIZE>> {
  if (pos === BIT_ARRAY_SIZE) {
    return stream;
  }

  return S.unwrapManaged(
    M.gen(function* (_) {
      const {
        tuple: [oneStream, zeroStream],
      } = yield* _(S.partition_(stream, (bits) => !!bits[pos]!));
      const sink = () =>
        SK.zipPar_(SK.collectAll<any, BitArray<BIT_ARRAY_SIZE>>(), SK.count());
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
        T.zipPar_(S.run_(zeroStream, sink()), S.run_(oneStream, sink()))
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
  ) as S.Stream<R, E | Error, BitArray<BIT_ARRAY_SIZE>>;
}

function findOxygenGeneratorRating<R, E>(
  stream: S.Stream<R, E, BitArray<BIT_ARRAY_SIZE>>
) {
  return pipe(
    findRating(stream, "highest"),
    S.runHead,
    T.some,
    T.map((_) => toBinary(AR.map_(_, STR.fromNumber).join("")))
  );
}

function findCO2ScrubberRating<R, E>(
  stream: S.Stream<R, E, BitArray<BIT_ARRAY_SIZE>>
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
        AR.map_(AR.range(0, BIT_ARRAY_SIZE - 1), (_) => 0),
        () => true,
        (bits, newBits: BitArray<BIT_ARRAY_SIZE>) =>
          AR.zipWith_(bits, newBits, (a, b) => a + b)
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
