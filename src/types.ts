export type DataStatus = "None" | "Ordered" | "Preparing..." | "Done";

export type RequestType = "get" | "update" | "delete";

//export type ClientType = "front" | "back";

export interface Data {
  name: string;
  status: DataStatus;
}
