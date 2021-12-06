import * as T from "@effect-ts/core/Effect";
import * as O from "@effect-ts/core/Option";
import * as BR from "@effect-ts/core/Branded";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as HM from "@effect-ts/core/Collections/Immutable/HashMap";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import {
  printResults,
  readFileAsStream,
  parseInteger,
  ParseError,
  ReadFileError,
} from "./utils";

const lanternFishStream = pipe(
  readFileAsStream("./inputs/day-6.txt"),
  S.splitOn(","),
  S.mapEffect((_) =>
    pipe(
      parseInteger(_) as O.Option<LanternFish>,
      T.fromOption,
      T.mapError(() => new ParseError(`${_} is not a number`))
    )
  )
);

type LanternFish = BR.Branded<number, "LanternFish">;

const INITIAL_FISH = 6 as LanternFish;

const NEW_FISH = 8 as LanternFish;

type State = HM.HashMap<LanternFish, number>;

const emptyState = HM.make<LanternFish, number>();

function stateOf(lanternFishes: CK.Chunk<LanternFish>): State {
  return CK.reduce_(lanternFishes, emptyState, (map, fish) =>
    HM.modify_(
      map,
      fish,
      O.fold(
        () => O.some(1),
        (oldNum) => O.some(oldNum + 1)
      )
    )
  );
}

function nextDay(state: State): State {
  return HM.reduceWithIndex_(state, emptyState, (newMap, fish, num) => {
    if (fish === 0) {
      return pipe(
        newMap,
        HM.set(NEW_FISH, num),
        HM.modify(
          INITIAL_FISH,
          O.fold(
            () => O.some(num),
            (oldNum) => O.some(oldNum + num)
          )
        )
      );
    } else {
      return HM.modify_(
        newMap,
        (fish - 1) as LanternFish,
        O.fold(
          () => O.some(num),
          (oldNum) => O.some(oldNum + num)
        )
      );
    }
  });
}

function numberOfLanternFishAfter(
  days: number
): T.Effect<unknown, ReadFileError | ParseError, number> {
  return pipe(
    lanternFishStream,
    S.runCollect,
    T.map((fishes) =>
      pipe(
        CK.range(1, days),
        CK.reduce(stateOf(fishes), nextDay),
        HM.reduce(0, (a, b) => a + b)
      )
    )
  );
}

const part1 = numberOfLanternFishAfter(80);

const part2 = numberOfLanternFishAfter(256);

printResults(6, part1, part2).catch(console.error);
