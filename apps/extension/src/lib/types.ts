export interface Member {
  id?: string;
  name: string;
  fur: string;
  furDark: string;
  host?: boolean;
  you?: boolean;
}

// snapshot of the message a reply points at, carried inline so it renders even
// for bears who never saw the original (chat history isn't persisted)
export interface ReplyRef {
  mid?: string;
  from: string;
  text: string;
}

export interface Message {
  id: number;
  // shared cross-client id (chat only); lets a reply reference the same message everywhere
  mid?: string;
  type: 'system' | 'chat';
  from?: string;
  text: string;
  mine?: boolean;
  ts?: number;
  replyTo?: ReplyRef;
}
