import * as O from "@effect-ts/core/Option";
import * as BR from "@effect-ts/core/Branded";
import * as T from "@effect-ts/core/Effect";
import * as STR from "@effect-ts/core/String";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as HS from "@effect-ts/core/Collections/Immutable/HashSet";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { flow, increment, pipe } from "@effect-ts/core/Function";
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

type Location = BR.Branded<Tp.Tuple<[number, number]>, "Location">;

const directions = ["up", "right", "down", "left"] as const;

type Direction = typeof directions[number];

function move(direction: Direction, { tuple: [x, y] }: Location) {
  switch (direction) {
    case "up":
      return Tp.tuple(x, y - 1) as Location;
    case "right":
      return Tp.tuple(x + 1, y) as Location;
    case "down":
      return Tp.tuple(x, y + 1) as Location;
    case "left":
      return Tp.tuple(x - 1, y) as Location;
  }
}

type RiskLevel = BR.Branded<number, "RiskLevel">;

type HeightMap = BR.Branded<CK.Chunk<CK.Chunk<Height>>, "HeightMap">;

const MAX_HEIGHT = 9;

const heightMap = pipe(
  readFileAsStream("./inputs/day-9.txt"),
  S.splitLines,
  S.map(flow(STR.split(""), CK.from, CK.forEachF(O.Applicative)(parseInteger))),
  S.someOrFail(() => new ParseError("Could not convert row to numbers")),
  S.runCollect
) as T.Effect<unknown, ReadFileError | ParseError, HeightMap>;

function lookup(heightMap: HeightMap, { tuple: [x, y] }: Location) {
  return pipe(heightMap, CK.get(y), O.chain(CK.get(x)));
}

function mapHeightMap<B>(
  heightMap: HeightMap,
  f: (height: Height, location: Location) => B
) {
  return CK.map_(CK.zipWithIndex(heightMap), ({ tuple: [row, y] }) =>
    CK.map_(CK.zipWithIndex(row), ({ tuple: [height, x] }) =>
      f(height, Tp.tuple(x, y) as Location)
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
        f(s, elem, Tp.tuple(x, y) as Location)
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
  alreadyMapped: HS.HashSet<Location>
) {
  return O.filter_(
    lookup(heightMap, location),
    (newHeight) => newHeight < MAX_HEIGHT && !HS.has_(alreadyMapped, location)
  );
}

function findBasinAtCoord(
  heightMap: HeightMap,
  location: Location,
  alreadyMapped: HS.HashSet<Location>
) {
  function exploreDirection(
    direction: Direction,
    location: Location,
    alreadyMapped: HS.HashSet<Location>
  ) {
    const currentLocationHash = location;
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
          increment
        )
    );
  }

  const go = (
    heightMap: HeightMap,
    location: Location,
    alreadyMapped: HS.HashSet<Location>
  ): Tp.Tuple<[number, HS.HashSet<Location>]> => {
    const height = lookupOrMaxHeight(heightMap, location);

    if (height === MAX_HEIGHT || HS.has_(alreadyMapped, location)) {
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

  return Tp.update_(go(heightMap, location, alreadyMapped), 0, increment);
}

function findBasinsAtHeight(
  heightMap: HeightMap,
  height: Height,
  alreadyMapped: HS.HashSet<Location>
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
      Tp.tuple(AR.empty as AR.Array<number>, HS.make<Location>()),
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
