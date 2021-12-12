import * as O from "@effect-ts/core/Option";
import * as BR from "@effect-ts/core/Branded";
import * as T from "@effect-ts/core/Effect";
import * as St from "@effect-ts/core/Structural";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as HM from "@effect-ts/core/Collections/Immutable/HashMap";
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

type Octopus = BR.Branded<number, "Octopus">;

function makeOctopus(octopus: number) {
  return octopus as Octopus;
}

type Grid = BR.Branded<HM.HashMap<Location, Octopus>, "Grid">;

function makeGrid() {
  return HM.make<Location, Octopus>() as Grid;
}

type Location = BR.Branded<Tp.Tuple<[x: number, y: number]>, "Location">;

function makeLocation(x: number, y: number) {
  return Tp.tuple(x, y) as Location;
}

const MAX_ENERGY = 9 as Octopus;

const NO_ENERGY = 0 as Octopus;

const grid = pipe(
  readFileAsStream("./inputs/day-11.txt"),
  S.splitLines,
  S.zipWithIndex,
  S.chain(({ tuple: [str, y] }) =>
    pipe(
      S.fromIterable(str),
      S.map((n) => parseInteger(n)),
      S.someOrFail(() => new ParseError("Could not convert row to numbers")),
      S.zipWithIndex,
      S.map(({ tuple: [octopus, x] }) =>
        Tp.tuple(makeOctopus(octopus), makeLocation(x, y))
      )
    )
  ),
  S.runReduce(
    makeGrid(),
    (map, { tuple: [octopus, location] }) =>
      HM.set_(map, location, octopus) as Grid
  )
);

function getNeighbours(location: Location) {
  const {
    tuple: [x, y],
  } = location;

  return pipe(
    range(-1, 1),
    CK.chain((offsetX) =>
      CK.map_(range(-1, 1), (offsetY) => makeLocation(x + offsetX, y + offsetY))
    ),
    CK.filter((neighbour) => !St.equals(neighbour, location))
  );
}

function increaseEnergyLevel(grid: Grid) {
  return HM.reduceWithIndex_(
    grid,
    Tp.tuple(HS.make<Location>(), makeGrid(), 0),
    ({ tuple: [flashed, newGrid, flashCount] }, location, octopus) => {
      const newEnergyLevel = octopus + 1;

      return newEnergyLevel > MAX_ENERGY
        ? Tp.tuple(
            HS.add_(flashed, location),
            HM.set_(newGrid, location, NO_ENERGY) as Grid,
            flashCount + 1
          )
        : Tp.tuple(
            flashed,
            HM.set_(newGrid, location, newEnergyLevel as Octopus) as Grid,
            flashCount
          );
    }
  );
}

function propagateFlashToNeighbours({
  tuple: [flashed, grid, flashCount],
}: Tp.Tuple<[HS.HashSet<Location>, Grid, number]>): Tp.Tuple<
  [HS.HashSet<Location>, Grid, number]
> {
  const state = CK.reduce_(
    CK.chain_(CK.from(flashed), getNeighbours),
    Tp.tuple(HS.make<Location>(), grid, flashCount),
    (state, neighbour) => {
      const {
        tuple: [newFlashed, newGrid, newFlashCount],
      } = state;

      return O.fold_(
        HM.get_(newGrid, neighbour),
        () => state,
        (octopus) => {
          const newEnergyLevel = octopus === NO_ENERGY ? octopus : octopus + 1;

          return newEnergyLevel > MAX_ENERGY
            ? Tp.tuple(
                HS.add_(newFlashed, neighbour),
                HM.set_(newGrid, neighbour, NO_ENERGY) as Grid,
                newFlashCount + 1
              )
            : Tp.tuple(
                newFlashed,
                HM.set_(newGrid, neighbour, newEnergyLevel as Octopus) as Grid,
                newFlashCount
              );
        }
      );
    }
  );

  return HS.size(Tp.get_(state, 0)) > 0
    ? propagateFlashToNeighbours(state)
    : state;
}

function makeStep(grid: Grid) {
  const {
    tuple: [_, updatedGrid, flashCount],
  } = propagateFlashToNeighbours(increaseEnergyLevel(grid));

  return Tp.tuple(updatedGrid, flashCount);
}

function isSynchronized(grid: Grid) {
  return HM.size(HM.filter_(grid, (octopus) => octopus !== NO_ENERGY)) === 0;
}

function findFirstSynchronizedStep(grid: Grid, currentStep = 0): number {
  return isSynchronized(grid)
    ? currentStep
    : findFirstSynchronizedStep(Tp.get_(makeStep(grid), 0), currentStep + 1);
}

function numberOfFlashesAtStep(grid: Grid, step: number) {
  return pipe(
    CK.range(1, step),
    CK.reduce(Tp.tuple(grid, 0), ({ tuple: [grid, flashes] }) =>
      Tp.update_(makeStep(grid), 1, (n) => n + flashes)
    ),
    Tp.get(1)
  );
}

const part1 = T.map_(grid, (grid) => numberOfFlashesAtStep(grid, 100));

const part2 = pipe(grid, T.map(findFirstSynchronizedStep));

printResults(11, part1, part2).catch(console.error);
