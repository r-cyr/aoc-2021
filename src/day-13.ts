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
  NotFoundError,
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

function makeFold(type: Fold["_tag"], value: number): Fold {
  return { _tag: type, value };
}

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
      S.runReduce(HS.make<Coordinates>(), (set, coords) => HS.add_(set, coords))
    );

    const allFolds = pipe(
      folds,
      S.map((line) =>
        pipe(
          line,
          STR.slice(11, line.length),
          STR.split("="),
          ([axis, value]) =>
            pipe(
              O.fromNullable(value),
              O.chain(parseInteger),
              O.zip(O.fromNullable(axis)),
              O.map(
                ({ tuple: [value, axis] }): Fold =>
                  makeFold(
                    axis === "x" ? "VerticalFold" : "HorizontalFold",
                    value
                  )
              )
            )
        )
      ),
      S.someOrFail(() => new ParseError("Could not parse Folds")),
      S.runCollect
    );

    return T.zipPar_(allCoords, allFolds);
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

function printAsGrid(coords: HS.HashSet<Coordinates>) {
  const { w: width, h: height } = HS.reduce_(
    coords,
    { w: 0, h: 0 },
    ({ w, h }, { tuple: [x, y] }) => ({ w: Math.max(w, x), h: Math.max(h, y) })
  );

  return pipe(
    range(0, height),
    CK.map((y) =>
      pipe(
        range(0, width),
        CK.map((x) => (HS.has_(coords, Tp.tuple(x, y)) ? "#" : " ")),
        CK.join("")
      )
    ),
    CK.join("\n")
  );
}

const part1 = pipe(
  coordinatesAndFolds,
  T.map(({ tuple: [coords, folds] }) =>
    O.map_(CK.head(folds), (fold) =>
      pipe(coords, HS.map(getFoldedCoordinates(fold)), HS.size)
    )
  ),
  T.someOrFail(() => new NotFoundError("Fold was not found"))
);

const part2 = pipe(
  coordinatesAndFolds,
  T.map(({ tuple: [coords, folds] }) => {
    const foldedCoordsSet = CK.reduce_(folds, coords, (set, fold) =>
      HS.map_(set, getFoldedCoordinates(fold))
    );

    return `\n${printAsGrid(foldedCoordsSet)}`;
  })
);

printResults(13, part1, part2).catch(console.error);
