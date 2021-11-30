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
export type FilesRemoteListResponse = WebAPICallResult & {
  ok?:                boolean;
  files?:             File[];
  response_metadata?: ResponseMetadata;
  error?:             string;
  needed?:            string;
  provided?:          string;
};

export interface File {
  id?:                        string;
  created?:                   number;
  timestamp?:                 number;
  name?:                      string;
  title?:                     string;
  mimetype?:                  string;
  filetype?:                  string;
  pretty_type?:               string;
  user?:                      string;
  editable?:                  boolean;
  size?:                      number;
  mode?:                      string;
  is_external?:               boolean;
  external_type?:             string;
  is_public?:                 boolean;
  public_url_shared?:         boolean;
  display_as_bot?:            boolean;
  username?:                  string;
  url_private?:               string;
  thumb_64?:                  string;
  thumb_80?:                  string;
  thumb_360?:                 string;
  thumb_360_w?:               number;
  thumb_360_h?:               number;
  thumb_480?:                 string;
  thumb_480_w?:               number;
  thumb_480_h?:               number;
  thumb_160?:                 string;
  thumb_720?:                 string;
  thumb_720_w?:               number;
  thumb_720_h?:               number;
  thumb_800?:                 string;
  thumb_800_w?:               number;
  thumb_800_h?:               number;
  thumb_960?:                 string;
  thumb_960_w?:               number;
  thumb_960_h?:               number;
  thumb_1024?:                string;
  thumb_1024_w?:              number;
  thumb_1024_h?:              number;
  image_exif_rotation?:       number;
  original_w?:                number;
  original_h?:                number;
  thumb_tiny?:                string;
  permalink?:                 string;
  channels?:                  string[];
  groups?:                    string[];
  ims?:                       string[];
  comments_count?:            number;
  media_display_type?:        string;
  subject?:                   string;
  non_owner_editable?:        boolean;
  editor?:                    string;
  last_editor?:               string;
  updated?:                   number;
  original_attachment_count?: number;
  external_id?:               string;
  external_url?:              string;
  url_private_download?:      string;
  app_id?:                    string;
  app_name?:                  string;
  thumb_64_gif?:              string;
  thumb_64_w?:                string;
  thumb_64_h?:                string;
  thumb_80_gif?:              string;
  thumb_80_w?:                string;
  thumb_80_h?:                string;
  thumb_160_gif?:             string;
  thumb_160_w?:               string;
  thumb_160_h?:               string;
  thumb_360_gif?:             string;
  thumb_480_gif?:             string;
  thumb_720_gif?:             string;
  thumb_800_gif?:             string;
  thumb_960_gif?:             string;
  thumb_1024_gif?:            string;
  thumb_video?:               string;
  thumb_gif?:                 string;
  thumb_pdf?:                 string;
  thumb_pdf_w?:               string;
  thumb_pdf_h?:               string;
  converted_pdf?:             string;
  deanimate?:                 string;
  deanimate_gif?:             string;
  pjpeg?:                     string;
  permalink_public?:          string;
  edit_link?:                 string;
  has_rich_preview?:          boolean;
  preview_is_truncated?:      boolean;
  preview?:                   string;
  preview_highlight?:         string;
  plain_text?:                string;
  preview_plain_text?:        string;
  has_more?:                  boolean;
  sent_to_self?:              boolean;
  lines?:                     number;
  lines_more?:                number;
  shares?:                    Shares;
  channel_actions_ts?:        string;
  channel_actions_count?:     number;
  headers?:                   Headers;
  simplified_html?:           string;
  bot_id?:                    string;
  initial_comment?:           InitialComment;
  num_stars?:                 number;
  is_starred?:                boolean;
}

export interface Headers {
  date?:        string;
  in_reply_to?: string;
  reply_to?:    string;
  message_id?:  string;
}

export interface InitialComment {
  id?:        string;
  created?:   number;
  timestamp?: number;
  user?:      string;
  comment?:   string;
  channel?:   string;
  is_intro?:  boolean;
}

export interface Shares {
}

export interface ResponseMetadata {
  next_cursor?: string;
}