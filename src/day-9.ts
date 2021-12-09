import * as O from "@effect-ts/core/Option";
import * as BR from "@effect-ts/core/Branded";
import * as T from "@effect-ts/core/Effect";
import * as STR from "@effect-ts/core/String";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as HS from "@effect-ts/core/Collections/Immutable/HashSet";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { flow, pipe } from "@effect-ts/core/Function";
import {
  printResults,
  readFileAsStream,
  range,
  ParseError,
  parseInteger,
  ReadFileError,
} from "./utils";
import { inverted, number } from "@effect-ts/core/Ord";

type Height = BR.Branded<number, "Height">;

interface Location {
  x: number;
  y: number;
}

const directions = ["up", "right", "down", "left"] as const;

type Direction = typeof directions[number];

function move(direction: Direction, { x, y }: Location) {
  switch (direction) {
    case "up":
      return { x, y: y - 1 };
    case "right":
      return { x: x + 1, y };
    case "down":
      return { x, y: y + 1 };
    case "left":
      return { x: x - 1, y };
  }
}

type RiskLevel = BR.Branded<number, "RiskLevel">;

type HeightMap = BR.Branded<CK.Chunk<CK.Chunk<Height>>, "HeightMap">;

type LocationHash = BR.Branded<"number", "LocationHash">;

function makeLocationHash({ x, y }: Location) {
  return `${x}-${y}` as LocationHash;
}

const MAX_HEIGHT = 9;

const heightMap = pipe(
  readFileAsStream("./inputs/day-9.txt"),
  S.splitLines,
  S.map(flow(STR.split(""), CK.from, CK.forEachF(O.Applicative)(parseInteger))),
  S.someOrFail(() => new ParseError("Could not convert row to numbers")),
  S.runCollect
) as T.Effect<unknown, ReadFileError | ParseError, HeightMap>;

function succ(n: number) {
  return n + 1;
}

function lookup(heightMap: HeightMap, { x, y }: Location) {
  return pipe(heightMap, CK.get(y), O.chain(CK.get(x)));
}

function mapHeightMap<B>(
  heightMap: HeightMap,
  f: (height: Height, location: Location) => B
) {
  return CK.map_(CK.zipWithIndex(heightMap), ({ tuple: [row, y] }) =>
    CK.map_(CK.zipWithIndex(row), ({ tuple: [height, x] }) =>
      f(height, { x, y })
    )
  );
}

function reduceHeightMap<S>(
  heightMap: HeightMap,
  state: S,
  f: (state: S, height: Height, location: Location) => S
) {
  return CK.reduce_(
    CK.zipWithIndex(heightMap),
    state,
    (s, { tuple: [row, y] }) =>
      CK.reduce_(CK.zipWithIndex(row), s, (s, { tuple: [elem, x] }) =>
        f(s, elem, { x, y })
      )
  );
}

function lookupOrMaxHeight(heightMap: HeightMap, location: Location) {
  return O.getOrElse_(lookup(heightMap, location), () => MAX_HEIGHT);
}

const part1 = pipe(
  heightMap,
  T.map((heightMap) =>
    pipe(
      mapHeightMap(
        heightMap,
        (height, location) =>
          (AR.map_(directions, (dir) =>
            lookupOrMaxHeight(heightMap, move(dir, location))
          ).some((heightAfter) => heightAfter <= height)
            ? 0
            : height + 1) as RiskLevel
      ),
      CK.flatten,
      CK.reduce(
        0 as RiskLevel,
        (total, riskLevel) => (total + riskLevel) as RiskLevel
      )
    )
  )
);

function lookupValidLocation(
  heightMap: HeightMap,
  location: Location,
  alreadyMapped: HS.HashSet<LocationHash>
) {
  return O.filter_(
    lookup(heightMap, location),
    (newHeight) =>
      newHeight < MAX_HEIGHT &&
      !HS.has_(alreadyMapped, makeLocationHash(location))
  );
}

function findBasinAtCoord(
  heightMap: HeightMap,
  location: Location,
  alreadyMapped: HS.HashSet<LocationHash>
) {
  function exploreDirection(
    direction: Direction,
    location: Location,
    alreadyMapped: HS.HashSet<LocationHash>
  ) {
    const currentLocationHash = makeLocationHash(location);
    const newLocation = move(direction, location);
    const alreadyMappedWithNewLocation = HS.add_(
      alreadyMapped,
      currentLocationHash
    );

    return O.fold_(
      lookupValidLocation(heightMap, newLocation, alreadyMapped),
      () => Tp.tuple(0, alreadyMappedWithNewLocation),
      () =>
        Tp.update_(
          go(heightMap, newLocation, alreadyMappedWithNewLocation),
          0,
          succ
        )
    );
  }

  const go = (
    heightMap: HeightMap,
    location: Location,
    alreadyMapped: HS.HashSet<LocationHash>
  ): Tp.Tuple<[number, HS.HashSet<LocationHash>]> => {
    const height = lookupOrMaxHeight(heightMap, location);

    if (
      height === MAX_HEIGHT ||
      HS.has_(alreadyMapped, makeLocationHash(location))
    ) {
      return Tp.tuple(0, alreadyMapped);
    }

    return AR.reduce_(
      directions,
      Tp.tuple(0, alreadyMapped),
      ({ tuple: [result, newAlreadyMapped] }, direction) =>
        Tp.update_(
          exploreDirection(direction, location, newAlreadyMapped),
          0,
          (newResult) => result + newResult
        )
    );
  };

  return Tp.update_(go(heightMap, location, alreadyMapped), 0, succ);
}

function findBasinsAtHeight(
  heightMap: HeightMap,
  height: Height,
  alreadyMapped: HS.HashSet<LocationHash>
) {
  return reduceHeightMap(
    heightMap,
    Tp.tuple(AR.empty as AR.Array<number>, alreadyMapped),
    (state, locationHeight, location) => {
      const {
        tuple: [basins, coords],
      } = state;

      return locationHeight === height
        ? Tp.update_(
            findBasinAtCoord(heightMap, location, coords),
            0,
            (basin) => AR.snoc_(basins, basin)
          )
        : state;
    }
  );
}

function findAllBasins(heightMap: HeightMap) {
  return pipe(
    range(MAX_HEIGHT - 1, 1) as unknown as CK.Chunk<Height>,
    CK.reduce(
      Tp.tuple(AR.empty as AR.Array<number>, HS.make<LocationHash>()),
      ({ tuple: [result, alreadyMapped] }, height) =>
        Tp.update_(
          findBasinsAtHeight(heightMap, height, alreadyMapped),
          0,
          AR.concat(result)
        )
    ),
    Tp.get(0)
  );
}

const part2 = pipe(
  heightMap,
  T.map(
    flow(
      findAllBasins,
      AR.sort(inverted(number)),
      AR.splitAt(3),
      Tp.get(0),
      AR.reduce(1, (a, b) => a * b)
    )
  )
);

printResults(9, part1, part2).catch(console.error);
