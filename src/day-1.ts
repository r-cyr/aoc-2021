import * as T from "@effect-ts/core/Effect";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as O from "@effect-ts/core/Option";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import { parseInteger, printLine, readFileAsStream } from "./utils";

(async () => {
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

  await pipe(
    T.forEach_(
      CK.zipWithIndex(CK.many(part1, part2)),
      ({ tuple: [part, index] }) =>
        T.chain_(part, (result) =>
          printLine(`The result for Day 1 Part ${index + 1} is ${result}`)
        )
    ),
    T.runPromise
  );
})().catch(console.error);
