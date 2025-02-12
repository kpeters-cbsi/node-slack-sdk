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
export type BookmarksEditResponse = WebAPICallResult & {
  ok?:                boolean;
  error?:             string;
  response_metadata?: ResponseMetadata;
  needed?:            string;
  provided?:          string;
  bookmark?:          Bookmark;
};

export interface Bookmark {
  id?:                      string;
  channel_id?:              string;
  title?:                   string;
  link?:                    string;
  emoji?:                   string;
  icon_url?:                string;
  entity_id?:               string;
  type?:                    string;
  date_created?:            number;
  date_updated?:            number;
  rank?:                    string;
  last_updated_by_user_id?: string;
  last_updated_by_team_id?: string;
  shortcut_id?:             string;
  app_id?:                  string;
}

export interface ResponseMetadata {
  messages?: string[];
}
