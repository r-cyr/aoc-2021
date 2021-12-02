import * as T from "@effect-ts/core/Effect";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as STR from "@effect-ts/core/String";
import * as O from "@effect-ts/core/Option";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import { parseInteger, printLine, readFileAsStream } from "./utils";

interface Up {
  readonly _tag: "Up";
  value: number;
}

interface Down {
  readonly _tag: "Down";
  value: number;
}

interface Forward {
  readonly _tag: "Forward";
  value: number;
}

type Direction = Up | Down | Forward;

function foldDirection_<Z1, Z2, Z3>(
  direction: Direction,
  onUp: (up: Up) => Z1,
  onDown: (down: Down) => Z2,
  onForward: (forward: Forward) => Z3
) {
  switch (direction._tag) {
    case "Up":
      return onUp(direction);
    case "Down":
      return onDown(direction);
    case "Forward":
      return onForward(direction);
  }
}

function toDirection(input: string): O.Option<Direction> {
  const directionMap: Record<string, Direction["_tag"]> = {
    up: "Up",
    down: "Down",
    forward: "Forward",
  };
  const isValidDirection = (dir: string) =>
    Object.keys(directionMap).includes(dir);
  const [dir, num] = STR.split_(input, /\s+/);

  return O.struct({
    _tag: pipe(
      O.fromNullable(dir),
      O.chain(O.fromPredicate(isValidDirection)),
      O.chain((str) => O.fromNullable(directionMap[str]))
    ),
    value: O.chain_(O.fromNullable(num), parseInteger),
  });
}

(async () => {
  const directionStream = pipe(
    readFileAsStream("./inputs/day-2.txt"),
    S.splitLines,
    S.mapEffect((line) => T.fromOption(toDirection(line)))
  );

  const part1 = pipe(
    directionStream,
    S.runReduce(
      Tp.tuple(0, 0),
      ({ tuple: [horizontalPosition, depth] }, direction) =>
        foldDirection_(
          direction,
          (up) => Tp.tuple(horizontalPosition, depth - up.value),
          (down) => Tp.tuple(horizontalPosition, depth + down.value),
          (forward) => Tp.tuple(horizontalPosition + forward.value, depth)
        )
    ),
    T.map(
      ({ tuple: [horizontalPosition, depth] }) => horizontalPosition * depth
    )
  );

  const part2 = pipe(
    directionStream,
    S.runReduce(
      Tp.tuple(0, 0, 0),
      ({ tuple: [horizontalPosition, depth, aim] }, direction) =>
        foldDirection_(
          direction,
          (up) => Tp.tuple(horizontalPosition, depth, aim - up.value),
          (down) => Tp.tuple(horizontalPosition, depth, aim + down.value),
          (forward) =>
            Tp.tuple(
              horizontalPosition + forward.value,
              depth + aim * forward.value,
              aim
            )
        )
    ),
    T.map(
      ({ tuple: [horizontalPosition, depth] }) => horizontalPosition * depth
    )
  );

  await pipe(
    T.forEach_(
      CK.zipWithIndex(CK.many(part1, part2)),
      ({ tuple: [part, index] }) =>
        T.chain_(part, (result) =>
          printLine(`The result for Day 2 Part ${index + 1} is ${result}`)
        )
    ),
    T.runPromise
  );
})().catch(console.error);
