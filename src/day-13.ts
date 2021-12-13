import * as O from "@effect-ts/core/Option";
import * as STR from "@effect-ts/core/String";
import * as BR from "@effect-ts/core/Branded";
import * as T from "@effect-ts/core/Effect";
import * as M from "@effect-ts/core/Effect/Managed";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as HS from "@effect-ts/core/Collections/Immutable/HashSet";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import {
  ParseError,
  parseInteger,
  printResults,
  range,
  readFileAsStream,
} from "./utils";

type Coordinates = BR.Branded<Tp.Tuple<[number, number]>, "Coordinates">;

interface HorizontalFold {
  readonly _tag: "HorizontalFold";
  readonly value: number;
}

interface VerticalFold {
  readonly _tag: "VerticalFold";
  readonly value: number;
}

type Fold = HorizontalFold | VerticalFold;

function foldFold<Z1, Z2>(
  fold: Fold,
  onHorizontal: (horizontal: HorizontalFold) => Z1,
  onVertical: (vertical: VerticalFold) => Z2
) {
  switch (fold._tag) {
    case "HorizontalFold":
      return onHorizontal(fold);
    case "VerticalFold":
      return onVertical(fold);
  }
}

const coordinatesAndFolds = pipe(
  readFileAsStream("./inputs/day-13.txt"),
  S.splitLines,
  S.partition((line) => !STR.startsWith_(line, "fold along")),
  M.use(({ tuple: [coords, folds] }) => {
    const allCoords = pipe(
      coords,
      S.filter((s) => !STR.isEmpty(STR.trim(s))),
      S.map(
        (line) =>
          pipe(
            line,
            STR.split(","),
            AR.forEachF(O.Applicative)(parseInteger),
            O.map((_) => Tp.fromNative(_))
          ) as O.Option<Coordinates>
      ),
      S.someOrFail(() => new ParseError("Could not parse Coordinates")),
      S.runCollect
    );

    const allFolds = pipe(
      folds,
      S.map((line) =>
        pipe(
          line,
          (line) => line.slice(11),
          STR.split("="),
          ([axis, value]) =>
            pipe(
              O.fromNullable(value),
              O.chain(parseInteger),
              O.zip(O.fromNullable(axis)),
              O.map(({ tuple: [value, axis] }): Fold => {
                if (axis === "x") {
                  return {
                    _tag: "VerticalFold",
                    value,
                  };
                }

                return {
                  _tag: "HorizontalFold",
                  value,
                };
              })
            )
        )
      ),
      S.someOrFail(() => new ParseError("Could not parse Folds")),
      S.runCollect
    );

    return T.zip_(allCoords, allFolds);
  })
);

function getFoldedCoordinates(fold: Fold) {
  return ({ tuple: [x, y] }: Coordinates) =>
    foldFold(
      fold,
      (h) =>
        (y >= h.value
          ? Tp.tuple(x, h.value - (y - h.value))
          : Tp.tuple(x, y)) as Coordinates,
      (v) =>
        (x >= v.value
          ? Tp.tuple(v.value - (x - v.value), y)
          : Tp.tuple(x, y)) as Coordinates
    );
}

function mapHashSet<A, B>(hs: HS.HashSet<A>, f: (a: A) => B) {
  return HS.reduce_(hs, HS.make<B>(), (newHs, elem) => HS.add_(newHs, f(elem)));
}

function printAsGrid(coords: HS.HashSet<Coordinates>) {
  const width = HS.reduce_(coords, 0, (s, { tuple: [x, _] }) => Math.max(s, x));
  const height = HS.reduce_(coords, 0, (s, { tuple: [_, y] }) =>
    Math.max(s, y)
  );

  return [
    ...CK.map_(range(0, height), (y) =>
      [
        ...CK.map_(range(0, width), (x) =>
          HS.has_(coords, Tp.tuple(x, y)) ? "#" : " "
        ),
      ].join("")
    ),
  ].join("\n");
}

const part1 = pipe(
  coordinatesAndFolds,
  T.map(({ tuple: [coords, folds] }) => {
    const firstFold = CK.unsafeHead(folds);

    const foldedCoordsSet = mapHashSet(
      CK.reduce_(coords, HS.make<Coordinates>(), (set, coords) =>
        HS.add_(set, coords)
      ),
      getFoldedCoordinates(firstFold)
    );
    return HS.size(foldedCoordsSet);
  })
);

const part2 = pipe(
  coordinatesAndFolds,
  T.map(({ tuple: [coords, folds] }) => {
    const coordsSet = CK.reduce_(
      coords,
      HS.make<Coordinates>(),
      (set, coords) => HS.add_(set, coords) as HS.HashSet<Coordinates>
    );

    const foldedCoordsSet = CK.reduce_(folds, coordsSet, (set, fold) =>
      mapHashSet(set, getFoldedCoordinates(fold))
    );

    return `\n${printAsGrid(foldedCoordsSet)}`;
  })
);

printResults(13, part1, part2).catch(console.error);
