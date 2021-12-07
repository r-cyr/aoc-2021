import * as T from "@effect-ts/core/Effect";
import * as O from "@effect-ts/core/Option";
import * as BR from "@effect-ts/core/Branded";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import {
  printResults,
  readFileAsStream,
  parseInteger,
  ParseError,
  range,
  ReadFileError,
} from "./utils";

type Crab = BR.Branded<number, "Crab">;

const MAX_ALIGNMENT = 500;

const crabStream = pipe(
  readFileAsStream("./inputs/day-7.txt"),
  S.splitOn(","),
  S.mapEffect((_) =>
    pipe(
      parseInteger(_) as O.Option<Crab>,
      T.fromOption,
      T.mapError(() => new ParseError(`${_} is not a number`))
    )
  )
);

function findLowestAlignmentFuelCost<
  F extends (distance: number) => T.Effect<unknown, never, number>
>(costFunction: F): T.Effect<unknown, ReadFileError | ParseError, number> {
  return T.gen(function* (_) {
    const crabs = yield* _(pipe(crabStream, S.runCollect));
    const memoizedCostFunction = yield* _(T.memoize(costFunction));
    const fuelCostPerAlignment = yield* _(
      T.forEach_(range(1, MAX_ALIGNMENT), (alignment: number) =>
        CK.reduceM_(crabs, 0, (totalCost, fuel) =>
          T.map_(
            memoizedCostFunction(Math.abs(fuel - alignment)),
            (cost) => cost + totalCost
          )
        )
      )
    );

    return Math.min(...fuelCostPerAlignment);
  });
}

function part1CostFunction(distance: number) {
  return T.succeed(distance);
}

const part1 = findLowestAlignmentFuelCost(part1CostFunction);

function part2CostFunction(distance: number) {
  return T.succeed(CK.reduce_(range(0, distance), 0, (acc, v) => acc + v));
}

const part2 = findLowestAlignmentFuelCost(part2CostFunction);

printResults(7, part1, part2).catch(console.error);
