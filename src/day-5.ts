import * as T from "@effect-ts/core/Effect";
import * as O from "@effect-ts/core/Option";
import * as RefM from "@effect-ts/core/Effect/RefM";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as MP from "@effect-ts/core/Collections/Immutable/Map";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import {
  printResults,
  readFileAsStream,
  parseInteger,
  range,
  ParseError,
} from "./utils";

const fileStream = readFileAsStream("./inputs/day-5.txt");

interface Point {
  readonly x: number;
  readonly y: number;
}

interface LineSegment {
  readonly a: Point;
  readonly b: Point;
}

function parseLineSegment(str: string): O.Option<LineSegment> {
  const tokens = [
    ...str.matchAll(/^(\d+),(\d+) -> (\d+),(\d+)$/g),
  ].flat() as string[];

  if (tokens.length !== 5) {
    return O.none;
  }

  return pipe(
    O.struct({
      x: parseInteger(tokens[1]!),
      y: parseInteger(tokens[2]!),
    }),
    O.zip(
      O.struct({
        x: parseInteger(tokens[3]!),
        y: parseInteger(tokens[4]!),
      })
    ),
    O.map(({ tuple: [a, b] }) => ({ a, b }))
  );
}

const hydrothermalVentStream = pipe(
  fileStream,
  S.splitLines,
  S.map(parseLineSegment),
  S.someOrFail(() => new ParseError("Could not parse LineSegments"))
);

function isHorizontal({ a, b }: LineSegment) {
  return a.y === b.y;
}

function isVertical({ a, b }: LineSegment) {
  return a.x === b.x;
}

function lineSegmentToPoints(ignoreDiagonals: boolean) {
  return (ls: LineSegment): CK.Chunk<Point> => {
    const { a, b } = ls;

    if (isHorizontal(ls)) {
      return CK.map_(range(a.x, b.x), (x) => ({ x, y: a.y }));
    }

    if (isVertical(ls)) {
      return CK.map_(range(a.y, b.y), (y) => ({ x: a.x, y }));
    }

    if (ignoreDiagonals) {
      return CK.empty<Point>();
    }

    return CK.zipWith_(range(a.x, b.x), range(a.y, b.y), (x, y) => ({ x, y }));
  };
}

function hashPoint(point: Point): string {
  return `${point.x}-${point.y}`;
}

function makePart(ignoreDiagonals: boolean) {
  return T.gen(function* (_) {
    const mapRef = yield* _(RefM.makeRefM<Map<string, number>>(new Map()));

    yield* _(
      pipe(
        hydrothermalVentStream,
        S.mapConcatChunk(lineSegmentToPoints(ignoreDiagonals)),
        S.mapEffect((point) =>
          RefM.update_(mapRef, (map) =>
            T.succeedWith(() => {
              const hash = hashPoint(point);
              const current = map.get(hash) ?? 0;

              return map.set(hash, current + 1);
            })
          )
        ),
        S.runDrain
      )
    );

    return pipe(
      yield* _(mapRef.get),
      MP.filterMap(O.fromPredicate((n) => n >= 2)),
      MP.size
    );
  });
}

const part1 = makePart(true);

const part2 = makePart(false);

printResults(5, part1, part2).catch(console.error);
