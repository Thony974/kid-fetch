export type DataStatus = "none" | "ordered" | "preparing";

export type RequestType =
  | "add"
  | "get"
  | "update"
  | "delete"
  | "rtc-offer"
  | "rtc-answer"
  | "rtc-ice-candidate";

export enum ClientType {
  Front = "front",
  Back = "back",
}

export interface Data {
  name: string;
  status: DataStatus;
}
