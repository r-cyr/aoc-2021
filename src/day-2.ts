import * as T from "@effect-ts/core/Effect";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as STR from "@effect-ts/core/String";
import * as O from "@effect-ts/core/Option";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import { parseInteger, printResults, readFileAsStream } from "./utils";

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

function parseDirection(input: string): O.Option<Direction> {
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

const directionStream = pipe(
  readFileAsStream("./inputs/day-2.txt"),
  S.splitLines,
  S.mapEffect((line) => T.fromOption(parseDirection(line)))
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
  T.map(({ tuple: [horizontalPosition, depth] }) => horizontalPosition * depth)
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
  T.map(({ tuple: [horizontalPosition, depth] }) => horizontalPosition * depth)
);

printResults(2, part1, part2).catch(console.error);
