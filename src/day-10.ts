import * as O from "@effect-ts/core/Option";
import * as BR from "@effect-ts/core/Branded";
import * as T from "@effect-ts/core/Effect";
import * as STR from "@effect-ts/core/String";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as AR from "@effect-ts/core/Collections/Immutable/Array";
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { pipe } from "@effect-ts/core/Function";
import {
  copy,
  includes_,
  printResults,
  readFileAsStream,
  ReadFileError,
} from "./utils";
import { number } from "@effect-ts/core/Ord";

const openingCharacters = ["(", "[", "{", "<"] as const;

type OpeningCharacter = typeof openingCharacters[number];

function isOpeningCharacter(c: Character): c is OpeningCharacter {
  return includes_(openingCharacters, c);
}

const closingCharacters = [")", "]", "}", ">"] as const;

type ClosingCharacter = typeof closingCharacters[number];

const characters = [...openingCharacters, ...closingCharacters] as const;

type Character = typeof characters[number];

function matches(oc: OpeningCharacter, cc: ClosingCharacter) {
  switch (oc) {
    case "(":
      return cc === ")";
    case "[":
      return cc === "]";
    case "<":
      return cc === ">";
    case "{":
      return cc === "}";
  }
}

function toClosingCharacter(oc: OpeningCharacter): ClosingCharacter {
  switch (oc) {
    case "(":
      return ")";
    case "[":
      return "]";
    case "<":
      return ">";
    case "{":
      return "}";
  }
}

class Stack<T> {
  constructor(readonly data: AR.Array<T> = []) {}

  push(t: T) {
    return new Stack(AR.cons_(this.data, t));
  }

  peek() {
    return AR.lookup_(this.data, 0);
  }

  pop() {
    return new Stack(AR.dropLeft_(this.data, 1));
  }

  toArray() {
    return copy(this.data);
  }
}

const lines = pipe(
  readFileAsStream("./inputs/day-10.txt"),
  S.splitLines,
  S.map(STR.split(""))
) as S.Stream<unknown, ReadFileError, AR.Array<Character>>;

type Score = BR.Branded<number, "Score">;

const part1PointTable: Record<ClosingCharacter, Score> = {
  ")": 3 as Score,
  "]": 57 as Score,
  "}": 1197 as Score,
  ">": 25137 as Score,
};

const part2PointTable: Record<ClosingCharacter, Score> = {
  ")": 1 as Score,
  "]": 2 as Score,
  "}": 3 as Score,
  ">": 4 as Score,
};

function getMiddleScore(scores: CK.Chunk<Score>) {
  return CK.unsafeGet_(
    CK.sort_(scores, number),
    Math.ceil(CK.size(scores) / 2) - 1
  );
}

const part1 = pipe(
  lines,
  S.map((characters) =>
    pipe(
      characters,
      AR.reduce(
        Tp.tuple(O.none as O.Option<Score>, new Stack<OpeningCharacter>()),
        (state, character) => {
          const {
            tuple: [result, stack],
          } = state;

          if (O.isSome(result)) {
            return state;
          }

          if (isOpeningCharacter(character)) {
            return Tp.tuple(O.none, stack.push(character));
          }

          return O.fold_(
            stack.peek(),
            () => Tp.tuple(O.none, stack),
            (c) =>
              !matches(c, character)
                ? Tp.tuple(O.some(part1PointTable[character]), stack.pop())
                : Tp.tuple(O.none, stack.pop())
          );
        }
      ),
      Tp.get(0),
      O.getOrElse(() => 0 as Score)
    )
  ),
  S.runSum
);

const part2 = pipe(
  lines,
  S.map((characters) =>
    pipe(
      characters,
      AR.reduce(
        Tp.tuple(false, new Stack<OpeningCharacter>()),
        (state, character) => {
          const {
            tuple: [corrupted, stack],
          } = state;

          if (corrupted) {
            return state;
          }

          if (isOpeningCharacter(character)) {
            return Tp.tuple(corrupted, stack.push(character));
          }

          return O.fold_(
            stack.peek(),
            () => Tp.tuple(corrupted, stack),
            (c) =>
              !matches(c, character)
                ? Tp.tuple(true, stack.pop())
                : Tp.tuple(corrupted, stack.pop())
          );
        }
      )
    )
  ),
  S.filter((tuple) => !Tp.get_(tuple, 0)),
  S.map((_) =>
    AR.reduce_(
      Tp.get_(_, 1).toArray(),
      0,
      (total, c) => total * 5 + part2PointTable[toClosingCharacter(c)]
    )
  ),
  S.runCollect,
  T.map((_) => getMiddleScore(_ as CK.Chunk<Score>))
);

printResults(10, part1, part2).catch(console.error);
