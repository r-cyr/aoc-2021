import * as T from "@effect-ts/core/Effect";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
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
  S.mapEffect((_) =>
    pipe(
      parseInteger(_),
      T.fromOption,
      T.mapError(() => new ParseError(`${_} is not a number`))
    )
  )
);

function runMeasurements<R, E>(
  self: S.Stream<R, E, Tp.Tuple<[O.Option<number>, number]>>
): T.Effect<R, E, number> {
  return S.runReduce_(self, 0, (acc, { tuple: [ma, b] }) =>
    O.fold_(
      ma,
      () => acc,
      (a) => acc + (b > a ? 1 : 0)
    )
  );
}

const part1 = pipe(numberStream, S.zipWithPrevious, runMeasurements);

const part2 = pipe(
  S.zip_(numberStream, S.drop_(numberStream, 1), S.drop_(numberStream, 2)),
  S.map(({ tuple: [a, b, c] }) => a + b + c),
  S.zipWithPrevious,
  runMeasurements
);

printResults(1, part1, part2).catch(console.error);
