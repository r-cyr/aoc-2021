import * as T from "@effect-ts/core/Effect";
import * as M from "@effect-ts/core/Effect/Managed";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import * as SK from "@effect-ts/core/Effect/Experimental/Stream/Sink";
import { constant, flow, pipe } from "@effect-ts/core/Function";
import {
  bitAt,
  stringToBitArray,
  generateBitMask,
  printResults,
  readFileAsStream,
  bitArrayToNumber,
} from "./utils";

const BIT_ARRAY_SIZE = 12;

const numberStream = pipe(
  readFileAsStream("./inputs/day-3.txt"),
  S.splitLines,
  S.map(flow(stringToBitArray, bitArrayToNumber))
);

type RatingType = "highest" | "lowest";

function findRating<R, E>(
  stream: S.Stream<R, E, number>,
  type: RatingType,
  offset = 0
): S.Stream<R, E, number> {
  if (offset === BIT_ARRAY_SIZE) {
    return stream;
  }

  return S.unwrapManaged(
    M.gen(function* (_) {
      const {
        tuple: [oneStream, zeroStream],
      } = yield* _(
        S.partition_(
          stream,
          (bits) => !!bitAt(BIT_ARRAY_SIZE - offset - 1, bits)
        )
      );
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
          return findRating(nextStream, type, offset + 1);
        }
      } else {
        const nextValues = onesSize >= zerosSize ? ones : zeros;
        const nextStream = S.fromChunk(nextValues);

        if (CK.size(nextValues) === 1) {
          return nextStream;
        } else {
          return findRating(nextStream, type, offset + 1);
        }
      }
    })
  );
}

function findOxygenGeneratorRating<R, E>(stream: S.Stream<R, E, number>) {
  return pipe(findRating(stream, "highest"), S.runHead, T.some);
}

function findCO2ScrubberRating<R, E>(stream: S.Stream<R, E, number>) {
  return pipe(findRating(stream, "lowest"), S.runHead, T.some);
}

const part1 = pipe(
  numberStream,
  S.run(
    SK.zipPar_(
      SK.reduce(
        AR.map_(AR.range(0, BIT_ARRAY_SIZE - 1), constant(0)),
        constant(true),
        (bits, newBits: number) =>
          AR.mapWithIndex_(
            bits,
            (index, n) => n + bitAt(BIT_ARRAY_SIZE - index - 1, newBits)
          )
      ),
      SK.count()
    )
  ),
  T.map(({ tuple: [bits, nbEntries] }) => {
    const gamma = bitArrayToNumber(
      AR.map_(bits, (bit) => (bit >= Math.floor(nbEntries / 2) ? 1 : 0))
    );
    const epsilon = ~gamma & generateBitMask(BIT_ARRAY_SIZE);

    return gamma * epsilon;
  })
);

const part2 = T.zipWithPar_(
  findOxygenGeneratorRating(numberStream),
  findCO2ScrubberRating(numberStream),
  (o2, co2) => o2 * co2
);

printResults(3, part1, part2).catch(console.error);
