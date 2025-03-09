import fs from "fs";
import path from "path";

import { Data } from "./types";

export interface IDataStorage {
  load: () => Data[];
  save: (data: Data[]) => void;
}

export default class JsonDataStorage implements IDataStorage {
  constructor(readonly jsonFilePath: string) {}

  load() {
    // TODO: secure the file exists / content
    const data = fs.readFileSync(this.jsonFilePath);
    return JSON.parse(data.toString());
  }

  save(data: Data[]) {
    fs.writeFileSync(this.jsonFilePath, JSON.stringify(data));
  }
}
