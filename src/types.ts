export type DataStatus = "None" | "Ordered" | "Preparing..." | "Done";

export type RequestType =
  | "get"
  | "update"
  | "delete"
  | "mediaStreamOffer"
  | "mediaStreamAnswer"
  | "mediaStreamIce";

//export type ClientType = "front" | "back";

export interface Data {
  name: string;
  status: DataStatus;
}
