export class FeedbackMsg {
  "for": string;
  "type": FeedbackType;
  "msg": string;
}

export enum FeedbackType {
  Success,
  Error,
  Info
}