import * as T from "@effect-ts/core/Effect";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as O from "@effect-ts/core/Option";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import {
  ParseError,
  parseInteger,
  printResults,
  readFileAsStream,
} from "./utils";

const numberStream = pipe(
  readFileAsStream("./inputs/day-1.txt"),
  S.splitLines,
  S.map(parseInteger),
  S.someOrFail(() => new ParseError(`Could not parse numbers`))
);

function runMeasurements<R, E>(
  self: S.Stream<R, E, Tp.Tuple<[O.Option<number>, number]>>
): T.Effect<R, E, number> {
  return S.runReduce_(
    self,
    0,
    (acc, { tuple: [ma, b] }) =>
      acc +
      O.fold_(
        ma,
        () => 0,
        (a) => (b > a ? 1 : 0)
      )
  );
}

const part1 = pipe(numberStream, S.zipWithPrevious, runMeasurements);

const part2 = pipe(
  numberStream,
  S.sliding(3),
  S.map(CK.reduce(0, (a, b) => a + b)),
  S.zipWithPrevious,
  runMeasurements
);

printResults(1, part1, part2).catch(console.error);
