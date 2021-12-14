import * as O from "@effect-ts/core/Option";
import * as STR from "@effect-ts/core/String";
import * as BR from "@effect-ts/core/Branded";
import * as T from "@effect-ts/core/Effect";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as HM from "@effect-ts/core/Collections/Immutable/HashMap";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import {
  ParseError,
  printResults,
  range,
  readFileAsStream,
  ReadFileError,
} from "./utils";

type PolymerTemplate = BR.Branded<string, "PolymerTemplate">;
type PairInsertionRule = BR.Branded<
  Tp.Tuple<[string, string]>,
  "PairInsertionRule"
>;

const lineStream = pipe(readFileAsStream("./inputs/day-14.txt"), S.splitLines);

const polymerTemplate = pipe(
  lineStream,
  S.take(1),
  S.runHead,
  T.someOrFail(() => new ParseError("Could not parse Polymer Template"))
) as T.Effect<unknown, ReadFileError | ParseError, PolymerTemplate>;

const pairInsertions = pipe(
  lineStream,
  S.drop(2),
  S.map((_) => pipe(STR.split_(_, " -> "), Tp.fromNative) as PairInsertionRule)
);

function polymerize(rules: HM.HashMap<string, string>) {
  return (map: HM.HashMap<string, number>) =>
    HM.reduceWithIndex_(map, HM.make<string, number>(), (newMap, pair, value) =>
      O.fold_(
        HM.get_(rules, pair),
        () => newMap,
        (insert) =>
          pipe(
            newMap,
            HM.modify(
              `${pair[0]}${insert}`,
              O.fold(
                () => O.some(value),
                (n) => O.some(n + value)
              )
            ),
            HM.modify(
              `${insert}${pair[1]}`,
              O.fold(
                () => O.some(value),
                (n) => O.some(n + value)
              )
            )
          )
      )
    );
}

const makePart = (steps: number) =>
  T.gen(function* (_) {
    const template = yield* _(polymerTemplate);

    const rules = yield* _(
      pipe(
        pairInsertions,
        S.runReduce(
          HM.make<string, string>(),
          (map, { tuple: [pair, insert] }) => HM.set_(map, pair, insert)
        )
      )
    );

    const beforePolymerization = yield* _(
      pipe(
        S.from(...template),
        S.sliding(2),
        S.map(CK.join("")),
        S.runReduce(HM.make<string, number>(), (map, pair) =>
          HM.modify_(
            map,
            pair,
            O.fold(
              () => O.some(1),
              (n) => O.some(n + 1)
            )
          )
        )
      )
    );

    const afterPolymerization = CK.reduce_(
      range(1, steps),
      beforePolymerization,
      polymerize(rules)
    );

    const resultMap = HM.reduceWithIndex_(
      afterPolymerization,
      HM.make<string, number>(),
      (map, pair, value) =>
        HM.modify_(
          map,
          pair[1]!,
          O.fold(
            () => O.some(value),
            (n) => O.some(n + value)
          )
        )
    );

    const { mostCommon, leastCommon } = AR.reduce_(
      AR.from(HM.values(resultMap)),
      { mostCommon: 0, leastCommon: Number.MAX_SAFE_INTEGER },
      ({ mostCommon, leastCommon }, value) => ({
        mostCommon: value > mostCommon ? value : mostCommon,
        leastCommon: value < leastCommon ? value : leastCommon,
      })
    );

    return mostCommon - leastCommon;
  });

const part1 = makePart(10);

const part2 = makePart(40);

printResults(14, part1, part2).catch(console.error);
