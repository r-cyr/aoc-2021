import * as T from "@effect-ts/core/Effect";
import * as O from "@effect-ts/core/Option";
import * as BR from "@effect-ts/core/Branded";
import * as STR from "@effect-ts/core/String";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as HM from "@effect-ts/core/Collections/Immutable/HashMap";
import * as HS from "@effect-ts/core/Collections/Immutable/HashSet";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { flow, pipe, Predicate } from "@effect-ts/core/Function";
import { printResults, readFileAsStream, range, ParseError } from "./utils";
import { string } from "@effect-ts/system/Ord";

type SignalPattern = BR.Branded<string, "SignalPattern">;
type OutputValue = BR.Branded<string, "OutputValue">;

export class DecodingError extends Error {
  readonly _tag = "DecodingError";

  constructor(message: string) {
    super(message);
    this.name = this._tag;
  }
}

const signalPatternsAndOutputValuesStream = pipe(
  readFileAsStream("./inputs/day-8.txt"),
  S.splitLines,
  S.map((line) => {
    const partToArray = <T extends string>(part: string | undefined) =>
      pipe(
        O.fromNullable(part),
        O.map(
          flow(
            STR.trim,
            STR.split(/\s+/),
            AR.map(flow(STR.split(""), AR.sort(string), AR.join("")))
          )
        )
      ) as O.Option<AR.Array<T>>;
    const [signalPatternsPart, outputValuesPart] = STR.split_(line, "|");

    return O.zip_(
      partToArray<SignalPattern>(signalPatternsPart),
      partToArray<OutputValue>(outputValuesPart)
    );
  }),
  S.someOrFail(
    () => new ParseError(`Could not parse SignaPattern and OutputValues`)
  )
);

const part1 = pipe(
  signalPatternsAndOutputValuesStream,
  S.map(Tp.get(1)),
  S.mapConcatChunk(CK.from),
  S.map((output) =>
    [
      2, // 1
      4, // 4
      3, // 7
      7, // 8
    ].includes(output.length)
      ? 1
      : 0
  ),
  S.runSum
);

function makeDecoder(signalPatterns: AR.Array<SignalPattern>) {
  const signalsByLength = AR.reduce_(
    signalPatterns,
    HM.make<number, HS.HashSet<SignalPattern>>(),
    (map, signal) =>
      HM.modify_(
        map,
        signal.length,
        O.fold(
          () => O.some(HS.add_(HS.make<SignalPattern>(), signal)),
          (xs) => O.some(HS.add_(xs, signal))
        )
      )
  );

  return O.gen(function* (_) {
    const safeHead = <T>(set: HS.HashSet<T>) => pipe(set, AR.from, AR.head);

    const containsEverySegmentFrom =
      (target: SignalPattern) => (source: SignalPattern) =>
        target.split("").every((l) => source.includes(l));

    const canBeContainedBySegmentsOf =
      (target: SignalPattern) => (source: SignalPattern) =>
        source.split("").every((l) => target.includes(l));

    const findAndSplit = <T>(set: HS.HashSet<T>, pred: Predicate<T>) => {
      const result = HS.partition_(set, pred);

      if (HS.size(result.left) === 0) {
        return O.none;
      }

      return O.map_(safeHead(result.right), (head) =>
        Tp.tuple(head, result.left)
      );
    };

    const _1 = yield* _(O.chain_(HM.get_(signalsByLength, 2), safeHead));
    const _4 = yield* _(O.chain_(HM.get_(signalsByLength, 4), safeHead));
    const _7 = yield* _(O.chain_(HM.get_(signalsByLength, 3), safeHead));
    const _8 = yield* _(O.chain_(HM.get_(signalsByLength, 7), safeHead));

    const withLength5 = yield* _(HM.get_(signalsByLength, 5));

    const {
      tuple: [_3, twoAndFive],
    } = yield* _(findAndSplit(withLength5, containsEverySegmentFrom(_1)));

    const withLength6 = yield* _(HM.get_(signalsByLength, 6));

    const {
      tuple: [_9, zeroAndSix],
    } = yield* _(findAndSplit(withLength6, containsEverySegmentFrom(_3)));

    const {
      tuple: [_5, two],
    } = yield* _(findAndSplit(twoAndFive, canBeContainedBySegmentsOf(_9)));

    const _2 = yield* _(safeHead(two));

    const {
      tuple: [_6, zero],
    } = yield* _(findAndSplit(zeroAndSix, containsEverySegmentFrom(_5)));

    const _0 = yield* _(safeHead(zero));

    return AR.reduceWithIndex_(
      [_0, _1, _2, _3, _4, _5, _6, _7, _8, _9],
      HM.make<OutputValue, number>(),
      (index, map, value) =>
        HM.set_(map, value as unknown as OutputValue, index)
    );
  });
}

const part2 = pipe(
  signalPatternsAndOutputValuesStream,
  S.map(({ tuple: [signalPatterns, outputs] }) =>
    O.map_(makeDecoder(signalPatterns), (dictionary) =>
      pipe(
        CK.zip_(range(outputs.length - 1, 0), CK.from(outputs)),
        CK.reduceRight(
          0,
          ({ tuple: [index, output] }, acc) =>
            acc + HM.unsafeGet_(dictionary, output) * 10 ** index
        )
      )
    )
  ),
  S.someOrFail(() => new DecodingError("Could not decode OutputSignal")),
  S.runSum
);

printResults(8, part1, part2).catch(console.error);
