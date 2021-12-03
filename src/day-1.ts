import * as O from "@effect-ts/core/Option";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import { parseInteger, printResults, readFileAsStream } from "./utils";

const numberStream = pipe(
  readFileAsStream("./inputs/day-1.txt"),
  S.splitLines,
  S.map(parseInteger),
  S.some
);

const part1 = pipe(
  numberStream,
  S.zipWithPrevious,
  S.runReduce(0, (acc, { tuple: [ma, b] }) =>
    O.fold_(
      ma,
      () => acc,
      (a) => acc + (b > a ? 1 : 0)
    )
  )
);

const part2 = pipe(
  S.zip_(numberStream, S.drop_(numberStream, 1), S.drop_(numberStream, 2)),
  S.map(({ tuple: [a, b, c] }) => a + b + c),
  S.zipWithPrevious,
  S.runReduce(0, (acc, { tuple: [ma, b] }) =>
    O.fold_(
      ma,
      () => acc,
      (a) => acc + (b > a ? 1 : 0)
    )
  )
);

printResults(1, part1, part2).catch(console.error);
