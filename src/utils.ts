import * as T from "@effect-ts/core/Effect";
import * as O from "@effect-ts/core/Option";
import * as CK from "@effect-ts/core/Collections/Immutable/Chunk";
import * as S from "@effect-ts/core/Effect/Experimental/Stream";
import { createReadStream } from "fs";

export function readFileAsStream(path: string) {
  return S.async<unknown, Error, string>((emit) => {
    const readStream = createReadStream(path, "utf-8");

    readStream.on("readable", () => {
      let chunk;
      while ((chunk = readStream.read()) !== null) {
        emit.chunk(CK.single(chunk));
      }
    });

    readStream.on("error", (error) => {
      emit.fail(error);
    });

    readStream.on("end", () => {
      emit.end();
    });
  });
}

export function parseInteger(str: string) {
  return O.fromPredicate_(Number(str), (result) => !Number.isNaN(result));
}

export function printLine(...args: any[]) {
  return T.succeedWith(() => {
    console.log(...args);
  });
}
