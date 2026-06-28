export interface Member {
  id?: string;
  name: string;
  fur: string;
  furDark: string;
  avatar?: string;
  host?: boolean;
  you?: boolean;
}

// inline snapshot of the replied-to message, since chat history isn't persisted
export interface ReplyRef {
  mid?: string;
  from: string;
  text: string;
}

export interface Message {
  id: number;
  // shared cross-client id so a reply can reference the same message everywhere
  mid?: string;
  type: 'system' | 'chat';
  from?: string;
  text: string;
  mine?: boolean;
  ts?: number;
  replyTo?: ReplyRef;
}
