import * as O from "@effect-ts/core/Option";
import * as STR from "@effect-ts/core/String";
import * as BR from "@effect-ts/core/Branded";
import * as T from "@effect-ts/core/Effect";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as HM from "@effect-ts/core/Collections/Immutable/HashMap";
import * as HS from "@effect-ts/core/Collections/Immutable/HashSet";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import { printResults, readFileAsStream } from "./utils";

type Cave = BR.Branded<string, "Cave">;

type CaveMap = BR.Branded<HM.HashMap<Cave, AR.Array<Cave>>, "CaveMap">;

const START = "start" as Cave;

const END = "end" as Cave;

function isSmallCave(cave: Cave) {
  return cave.toLowerCase() === cave;
}

const caveMap = pipe(
  readFileAsStream("./inputs/day-12.txt"),
  S.splitLines,
  S.map((_) => Tp.fromNative(STR.split_(_, "-")) as Tp.Tuple<[Cave, Cave]>),
  S.runReduce(
    HM.make<Cave, AR.Array<Cave>>() as CaveMap,
    (map, { tuple: [a, b] }) =>
      pipe(
        map,
        HM.modify(
          a,
          O.fold(
            () => O.some([b]),
            (caves) => O.some(AR.snoc_(caves, b))
          )
        ),
        HM.modify(
          b,
          O.fold(
            () => O.some([a]),
            (caves) => O.some(AR.snoc_(caves, a))
          )
        )
      ) as CaveMap
  )
);

type Mode = "standard" | "allow-second-visit";

function calculatePaths(mode: Mode) {
  return (map: CaveMap) => {
    const doCalculatePaths = (
      visited: HS.HashSet<Cave>,
      cave: Cave,
      allowSecondVisit: boolean
    ): number => {
      if (cave === END) {
        return 1;
      }

      const newVisited = isSmallCave(cave) ? HS.add_(visited, cave) : visited;

      return AR.reduce_(HM.unsafeGet_(map, cave), 0, (total, nextCave) => {
        if (nextCave === START) {
          return total;
        }

        if (HS.has_(newVisited, nextCave)) {
          if (isSmallCave(nextCave) && allowSecondVisit) {
            return total + doCalculatePaths(newVisited, nextCave, false);
          } else {
            return total;
          }
        }

        return total + doCalculatePaths(newVisited, nextCave, allowSecondVisit);
      });
    };

    return doCalculatePaths(HS.make(), START, mode === "allow-second-visit");
  };
}

const part1 = pipe(caveMap, T.map(calculatePaths("standard")));

const part2 = pipe(caveMap, T.map(calculatePaths("allow-second-visit")));

printResults(12, part1, part2).catch(console.error);
