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
export type OauthAccessResponse = WebAPICallResult & {
  ok?:               boolean;
  warning?:          string;
  error?:            string;
  needed?:           string;
  provided?:         string;
  token_type?:       string;
  access_token?:     string;
  scope?:            string;
  enterprise_id?:    string;
  team_name?:        string;
  team_id?:          string;
  user_id?:          string;
  incoming_webhook?: IncomingWebhook;
  bot?:              Bot;
  authorizing_user?: User;
  installer_user?:   User;
  scopes?:           Scopes;
};

export interface User {
  user_id?:  string;
  app_home?: string;
}

export interface Bot {
  bot_user_id?:      string;
  bot_access_token?: string;
}

export interface IncomingWebhook {
  url?:               string;
  channel?:           string;
  channel_id?:        string;
  configuration_url?: string;
}

export interface Scopes {
  app_home?: string[];
  team?:     string[];
  channel?:  string[];
  group?:    string[];
  mpim?:     string[];
  im?:       string[];
  user?:     string[];
}
