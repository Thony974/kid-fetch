import EventEmitter from "events";
import path from "path";

import { Data, DataStatus } from "./types";
import JsonDataStorage, { IDataStorage } from "./DataStorage";

const jsonStorageFilePath = path.join(__dirname, "../data/list.json");
const defaultStatus: DataStatus = "none";

export default class PendingData extends EventEmitter {
  private items: Data[];
  private dataStorage: IDataStorage;

  constructor() {
    super();
    this.dataStorage = new JsonDataStorage(jsonStorageFilePath);
    this.items = this.dataStorage.load();
  }

  get data() {
    return this.items;
  }

  has(name: string) {
    for (const element of this.items) {
      if (element.name === name) return true;
    }

    return false;
  }

  add(data: string) {
    this.items.push({ name: data, status: defaultStatus });
    this.onItemsChanged();
  }

  remove(data: string) {
    this.items = this.items.filter((item) => item.name !== data);
    this.onItemsChanged();
  }

  update(name: string, status: DataStatus) {
    for (const item of this.items) {
      if (item.name === name) {
        item.status = status;
        break;
      }
    }

    this.onItemsChanged();
  }

  private onItemsChanged() {
    this.dataStorage.save(this.items);
    this.emit("data-changed", this.items);
  }
}
