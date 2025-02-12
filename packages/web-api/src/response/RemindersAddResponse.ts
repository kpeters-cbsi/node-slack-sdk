/* eslint-disable */
/////////////////////////////////////////////////////////////////////////////////////////
//                                                                                     //
// !!! DO NOT EDIT THIS FILE !!!                                                       //
//                                                                                     //
// This file is auto-generated by scripts/generate-web-api-types.sh in the repository. //
// Please refer to the script code to learn how to update the source data.             //
//                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////

import { WebAPICallResult } from '../WebClient';
export type RemindersAddResponse = WebAPICallResult & {
  ok?:                boolean;
  reminder?:          Reminder;
  error?:             string;
  response_metadata?: ResponseMetadata;
  needed?:            string;
  provided?:          string;
};

export interface Reminder {
  id?:          string;
  creator?:     string;
  text?:        string;
  user?:        string;
  recurring?:   boolean;
  time?:        number;
  complete_ts?: number;
}

export interface ResponseMetadata {
  messages?: string[];
}
