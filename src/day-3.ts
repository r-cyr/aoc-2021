import * as T from "@effect-ts/core/Effect";
import * as STR from "@effect-ts/core/String";
import * as O from "@effect-ts/core/Option";
import * as M from "@effect-ts/core/Effect/Managed";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import * as SK from "@effect-ts/core/Effect/Experimental/Stream/Sink";
import { constant, pipe } from "@effect-ts/core/Function";
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

const bitArrayStream = pipe(
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
): S.Stream<R, E, BitArray<BIT_ARRAY_SIZE>> {
  if (pos === BIT_ARRAY_SIZE) {
    return stream;
  }

  return S.unwrapManaged(
    M.gen(function* (_) {
      const {
        tuple: [oneStream, zeroStream],
      } = yield* _(S.partition_(stream, (bits) => !!bits[pos]!));
      const {
        tuple: [zeros, ones],
      } = yield* _(
        T.zipPar_(
          S.run_(zeroStream, SK.collectAll()),
          S.run_(oneStream, SK.collectAll())
        )
      );
      const zerosSize = CK.size(zeros);
      const onesSize = CK.size(ones);

      if (type === "lowest") {
        const nextValues = onesSize >= zerosSize ? zeros : ones;
        const nextStream = S.fromChunk(nextValues);

        if (CK.size(nextValues) === 1) {
          return nextStream;
        } else {
          return findRating(nextStream, type, pos + 1);
        }
      } else {
        const nextValues = onesSize >= zerosSize ? ones : zeros;
        const nextStream = S.fromChunk(nextValues);

        if (CK.size(nextValues) === 1) {
          return nextStream;
        } else {
          return findRating(nextStream, type, pos + 1);
        }
      }
    })
  );
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
  bitArrayStream,
  S.run(
    SK.zipPar_(
      SK.reduce(
        AR.map_(AR.range(0, BIT_ARRAY_SIZE - 1), constant(0)),
        constant(true),
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
  findOxygenGeneratorRating(bitArrayStream),
  findCO2ScrubberRating(bitArrayStream),
  (o2, co2) => o2 * co2
);

printResults(3, part1, part2).catch(console.error);
