import * as T from "@effect-ts/core/Effect";
import * as O from "@effect-ts/core/Option";
import * as STR from "@effect-ts/core/String";
import * as BR from "@effect-ts/core/Branded";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as HM from "@effect-ts/core/Collections/Immutable/HashMap";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
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

type Point = BR.Branded<Tp.Tuple<[number, number]>, "Point">;

interface LineSegment {
  readonly a: Point;
  readonly b: Point;
}

function parseLineSegment(str: string): O.Option<LineSegment> {
  return pipe(
    STR.matchAll_(str, /^(\d+),(\d+) -> (\d+),(\d+)$/g),
    O.map(AR.flatten),
    O.filter((tokens) => AR.size(tokens) === 5),
    O.chain((tokens) =>
      pipe(
        O.map_(
          O.tuple(parseInteger(tokens[1]!), parseInteger(tokens[2]!)),
          Tp.fromNative
        ),
        O.zip(
          O.map_(
            O.tuple(parseInteger(tokens[3]!), parseInteger(tokens[4]!)),
            Tp.fromNative
          )
        )
      )
    ),
    O.map(({ tuple: [a, b] }) => ({ a, b } as LineSegment))
  );
}

const hydrothermalVentStream = pipe(
  fileStream,
  S.splitLines,
  S.map(parseLineSegment),
  S.someOrFail(() => new ParseError("Could not parse LineSegments"))
);

function isHorizontal({ a, b }: LineSegment) {
  return Tp.get_(a, 1) === Tp.get_(b, 1);
}

function isVertical({ a, b }: LineSegment) {
  return Tp.get_(a, 0) === Tp.get_(b, 0);
}

type IgnoreFlag = "ignore-diagonals" | "ignore-none";

function lineSegmentToPoints(ignoreFlag: IgnoreFlag) {
  return (ls: LineSegment): CK.Chunk<Point> => {
    const { a, b } = ls;
    const {
      tuple: [ax, ay],
    } = a;
    const {
      tuple: [bx, by],
    } = b;

    if (isHorizontal(ls)) {
      return CK.map_(range(ax, bx), (x) => Tp.tuple(x, ay) as Point);
    }

    if (isVertical(ls)) {
      return CK.map_(range(ay, by), (y) => Tp.tuple(ax, y) as Point);
    }

    if (ignoreFlag === "ignore-diagonals") {
      return CK.empty<Point>();
    }

    return CK.zipWith_(
      range(ax, bx),
      range(ay, by),
      (x, y) => Tp.tuple(x, y) as Point
    );
  };
}

function makePart(ignoreFlag: IgnoreFlag) {
  return pipe(
    hydrothermalVentStream,
    S.mapConcatChunk(lineSegmentToPoints(ignoreFlag)),
    S.buffer(100), // Why do I get a stack overflow without buffering?
    S.runReduce(HM.make<Point, number>(), (map, point) =>
      HM.modify_(
        map,
        point,
        O.fold(
          () => O.some(1),
          (n) => O.some(n + 1)
        )
      )
    ),
    T.map((map) =>
      pipe(map, HM.filterMap(O.fromPredicate((n) => n >= 2)), HM.size)
    )
  );
}

const part1 = makePart("ignore-diagonals");

const part2 = makePart("ignore-none");

printResults(5, part1, part2).catch(console.error);
