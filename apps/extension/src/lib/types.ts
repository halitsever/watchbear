export interface Member {
  id?: string;
  name: string;
  fur: string;
  furDark: string;
  host?: boolean;
  you?: boolean;
}

export interface Message {
  id: number;
  type: 'system' | 'chat';
  from?: string;
  text: string;
  mine?: boolean;
}
